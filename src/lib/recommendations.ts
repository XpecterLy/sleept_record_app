import { factorLabel } from './format';
import {
  ageOf,
  avg,
  bedtimeStats,
  bmiOf,
  chronotype,
  essInterpretation,
  recommendedSleep,
  sleepDebt,
  socialJetlag,
  stopBang,
} from './science';
import { detectionAccuracy } from './store';
import type { Night, NightSummary, PreSleepFactor, Profile } from './types';

export type Priority = 'alta' | 'media' | 'baja';

export interface Recommendation {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  category: 'Salud' | 'Ronquido' | 'Hábitos' | 'Horario' | 'Ambiente';
  source: string;
}

const PRIORITY_ORDER: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };

/** Average snore % on nights WITH a factor vs WITHOUT it (needs ≥2 nights each). */
export function factorImpact(nights: NightSummary[], factor: PreSleepFactor) {
  const withF = nights.filter((n) => n.factors.includes(factor));
  const without = nights.filter((n) => !n.factors.includes(factor));
  if (withF.length < 2 || without.length < 2) return null;
  return {
    withPct: avg(withF.map((n) => n.metrics.snorePct)),
    withoutPct: avg(without.map((n) => n.metrics.snorePct)),
    withSleep: avg(withF.map((n) => n.metrics.sleepMin)),
    withoutSleep: avg(without.map((n) => n.metrics.sleepMin)),
    withQuality: avg(withF.filter((n) => n.survey).map((n) => n.survey!.quality)),
    withoutQuality: avg(without.filter((n) => n.survey).map((n) => n.survey!.quality)),
    nWith: withF.length,
    nWithout: without.length,
  };
}

/**
 * Builds personalised, evidence-based recommendations from the profile and the
 * recorded nights. Each rule only fires when the user's own data supports it.
 */
export function buildRecommendations(p: Profile, nights: NightSummary[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const name = p.name;
  const age = ageOf(p);
  const bmi = bmiOf(p);
  const recent = nights.slice(0, 14);
  const has = recent.length > 0;
  const avgSnore = avg(recent.map((n) => n.metrics.snorePct));
  const sb = stopBang(p, recent);
  const nightsWithPauses = recent.filter((n) => n.metrics.pausesPerHour >= 5).length;
  const symptomNights = recent.filter((n) =>
    n.survey?.symptoms.some((s) => s === 'chokingWake' || s === 'headache' || s === 'dryMouth'),
  ).length;

  // ---- Medical screening -------------------------------------------------
  if (sb.risk !== 'Bajo' || nightsWithPauses >= 2 || (p.observedApnea && avgSnore > 5)) {
    const reasons: string[] = [];
    if (sb.risk !== 'Bajo') reasons.push(`tu cuestionario STOP-BANG da ${sb.score}/8 (riesgo ${sb.risk.toLowerCase()})`);
    if (nightsWithPauses >= 2) reasons.push(`detectamos posibles pausas respiratorias en ${nightsWithPauses} noches`);
    if (p.observedApnea) reasons.push('alguien ha observado que dejas de respirar');
    recs.push({
      id: 'osa-screen',
      title: 'Consulta con un especialista del sueño',
      body: `${name}, ${reasons.join(', ')}. Estos son indicadores de posible apnea obstructiva del sueño (AOS), una condición frecuente y tratable que se asocia a hipertensión y riesgo cardiovascular. Esta app no puede diagnosticarla: el diagnóstico se hace con polisomnografía o poligrafía respiratoria domiciliaria. Lleva tus informes de Noctua a la consulta.`,
      priority: sb.risk === 'Alto' || nightsWithPauses >= 2 ? 'alta' : 'media',
      category: 'Salud',
      source: 'AASM Clinical Practice Guideline, Kapur et al., J Clin Sleep Med 2017; Chung et al., Chest 2016',
    });
  }

  if (p.ess && p.ess.score > 10) {
    const i = essInterpretation(p.ess.score);
    recs.push({
      id: 'ess',
      title: 'Tu somnolencia diurna es elevada',
      body: `Tu Escala de Epworth es ${p.ess.score}/24 (${i.label.toLowerCase()}). Una puntuación >10 indica somnolencia diurna excesiva, que puede deberse a sueño insuficiente, apnea u otros trastornos. Evita conducir si sientes sueño y coméntalo con tu médico.`,
      priority: p.ess.score >= 16 ? 'alta' : 'media',
      category: 'Salud',
      source: 'Johns MW, Sleep 1991',
    });
  }

  if (symptomNights >= 2) {
    recs.push({
      id: 'symptoms',
      title: 'Síntomas matutinos recurrentes',
      body: `Has reportado boca seca, dolor de cabeza o despertares con sensación de ahogo en ${symptomNights} mañanas. La boca seca suele indicar respiración oral nocturna; el dolor de cabeza matutino y el despertar con ahogo son síntomas descritos en la apnea del sueño. Vale la pena mencionarlo a tu médico.`,
      priority: 'media',
      category: 'Salud',
      source: 'AASM International Classification of Sleep Disorders, 3rd ed.',
    });
  }

  // ---- Snoring ------------------------------------------------------------
  if (has && avgSnore >= 10) {
    recs.push({
      id: 'positional',
      title: 'Prueba dormir de lado',
      body: `${name}, roncas de media un ${avgSnore.toFixed(0)}% de la noche. Dormir boca arriba hace que la lengua y el paladar blando caigan hacia atrás y estrechen la vía aérea; en muchas personas el ronquido y las apneas son "posicionales". Usa una almohada en la espalda o una almohada corporal para mantenerte de lado, y eleva ligeramente la cabecera.`,
      priority: avgSnore >= 25 ? 'alta' : 'media',
      category: 'Ronquido',
      source: 'Oksenberg & Silverberg, Sleep Med Rev 1998; Ravesloot et al., Sleep Breath 2013',
    });
  }

  if (has && avgSnore >= 10 && bmi && bmi >= 25) {
    recs.push({
      id: 'weight',
      title: 'El peso influye directamente en tu ronquido',
      body: `Tu IMC es ${bmi}. El tejido graso alrededor del cuello estrecha la vía aérea. En un estudio prospectivo, perder un 10% del peso se asoció a una reducción aproximada del 26% en el índice de apneas, y en muchas personas reduce o elimina el ronquido. Un objetivo realista sería perder ${(p.weightKg! * 0.05).toFixed(1)}–${(p.weightKg! * 0.1).toFixed(1)} kg de forma gradual.`,
      priority: bmi >= 30 ? 'alta' : 'media',
      category: 'Ronquido',
      source: 'Peppard et al., JAMA 2000',
    });
  }

  const alcohol = factorImpact(recent, 'alcohol');
  if (alcohol && alcohol.withPct > alcohol.withoutPct + 3) {
    recs.push({
      id: 'alcohol-data',
      title: 'El alcohol aumenta tu ronquido',
      body: `En tus datos: las noches con alcohol roncaste un ${alcohol.withPct.toFixed(0)}% del tiempo frente a un ${alcohol.withoutPct.toFixed(0)}% sin alcohol. El alcohol relaja los músculos que mantienen abierta la garganta. Evítalo al menos 3–4 horas antes de dormir.`,
      priority: 'alta',
      category: 'Ronquido',
      source: 'Simou et al., Sleep Med 2018 (metaanálisis alcohol y apnea)',
    });
  } else if (recent.some((n) => n.factors.includes('alcohol')) && avgSnore >= 5) {
    recs.push({
      id: 'alcohol',
      title: 'Evita el alcohol antes de dormir',
      body: 'El alcohol relaja la musculatura de la vía aérea superior y aumenta el ronquido y las apneas. Además fragmenta el sueño en la segunda mitad de la noche. Intenta no beber en las 3–4 horas previas a acostarte.',
      priority: 'media',
      category: 'Ronquido',
      source: 'Simou et al., Sleep Med 2018',
    });
  }

  const congestion = factorImpact(recent, 'congestion');
  if (recent.some((n) => n.factors.includes('congestion'))) {
    recs.push({
      id: 'nasal',
      title: 'Cuida tu respiración nasal',
      body: `${congestion && congestion.withPct > congestion.withoutPct ? `Con congestión nasal roncaste un ${congestion.withPct.toFixed(0)}% vs ${congestion.withoutPct.toFixed(0)}% sin ella. ` : ''}La obstrucción nasal obliga a respirar por la boca, lo que favorece la vibración del paladar. Lavados con suero salino, tratar la alergia (consulta a tu médico sobre corticoides nasales) y tiras dilatadoras nasales pueden ayudar.`,
      priority: 'media',
      category: 'Ronquido',
      source: 'Michels et al., Int Arch Otorhinolaryngol 2014',
    });
  }

  if (p.smoker) {
    recs.push({
      id: 'smoking',
      title: 'Fumar irrita e inflama la vía aérea',
      body: 'Los fumadores tienen aproximadamente el doble de probabilidad de roncar de forma habitual. El tabaco inflama la mucosa nasal y faríngea. Dejarlo mejora el ronquido y la calidad del sueño; tu médico puede ayudarte con un plan.',
      priority: avgSnore >= 10 ? 'alta' : 'media',
      category: 'Ronquido',
      source: 'Wetter et al., Arch Intern Med 1994',
    });
  }

  if (recent.some((n) => n.factors.includes('sedatives')) && avgSnore >= 5) {
    recs.push({
      id: 'sedatives',
      title: 'Revisa los sedantes con tu médico',
      body: 'Algunos sedantes y somníferos (p. ej. benzodiacepinas) disminuyen el tono muscular de la vía aérea y pueden empeorar el ronquido y la apnea. No suspendas ningún medicamento por tu cuenta: coméntalo con tu médico.',
      priority: 'media',
      category: 'Salud',
      source: 'AASM; Mason et al., Sleep Med Rev 2015',
    });
  }

  if (p.sex === 'female' && age >= 45 && age <= 60 && avgSnore >= 10) {
    recs.push({
      id: 'menopause',
      title: 'Cambios hormonales y ronquido',
      body: 'Tras la menopausia aumenta la prevalencia de ronquido y apnea en mujeres, por la pérdida del efecto protector de la progesterona sobre el tono de la vía aérea. Si tu ronquido es reciente, coméntalo con tu ginecólogo o médico de cabecera.',
      priority: 'baja',
      category: 'Salud',
      source: 'Young et al., Am J Respir Crit Care Med 2003',
    });
  }

  // ---- Duration & schedule -------------------------------------------------
  const rec = recommendedSleep(age);
  if (recent.length >= 3) {
    const sleepH = avg(recent.map((n) => (n.survey ? n.metrics.durationMin - n.survey.latencyMin : n.metrics.sleepMin))) / 60;
    if (sleepH < rec.min) {
      recs.push({
        id: 'short-sleep',
        title: 'Estás durmiendo menos de lo recomendado',
        body: `${name}, duermes de media ${sleepH.toFixed(1)} h. Para ${rec.group} se recomiendan ${rec.min}–${rec.max} h. Dormir menos de 7 h de forma habitual se asocia a peor rendimiento, aumento de peso, hipertensión y peor estado de ánimo. Adelanta tu hora de acostarte 15–20 minutos cada pocos días hasta alcanzar tu objetivo.`,
        priority: sleepH < rec.min - 1 ? 'alta' : 'media',
        category: 'Horario',
        source: 'Hirshkowitz et al., Sleep Health 2015; Watson et al., Sleep 2015',
      });
    }
  }

  const bt = bedtimeStats(recent);
  if (bt && bt.sdBed > 60) {
    recs.push({
      id: 'regularity',
      title: 'Haz tu horario más regular',
      body: `Tu hora de acostarte varía en promedio ±${Math.round(bt.sdBed)} minutos. La regularidad del sueño se asocia a mejor salud metabólica, ánimo y rendimiento, incluso independientemente de las horas totales. Intenta acostarte y levantarte a la misma hora (±30 min), también en fin de semana.`,
      priority: bt.sdBed > 90 ? 'alta' : 'media',
      category: 'Horario',
      source: 'Phillips et al., Sci Rep 2017; Windred et al., Sleep 2024',
    });
  }

  const debt = sleepDebt(recent, p);
  if (debt && debt.debtH >= 3) {
    recs.push({
      id: 'debt',
      title: `Acumulas ${debt.debtH} h de deuda de sueño`,
      body: `En los últimos 7 días (${debt.nights} noches registradas) dormiste ${debt.debtH} h menos de las ~${debt.needH} h que necesitas. La restricción crónica de sueño deteriora la atención de forma acumulativa, aunque uno deja de notarlo subjetivamente. Recupera de forma gradual: acuéstate 30–60 min antes durante varios días en lugar de dormir mucho más un solo día.`,
      priority: debt.debtH >= 7 ? 'alta' : 'media',
      category: 'Horario',
      source: 'Van Dongen et al., Sleep 2003; Banks & Dinges, J Clin Sleep Med 2007',
    });
  }

  const sj = socialJetlag(recent);
  if (sj && sj.hours >= 1) {
    recs.push({
      id: 'social-jetlag',
      title: `Jet lag social de ${sj.hours} h`,
      body: `${name}, el punto medio de tu sueño en fin de semana se desplaza ${sj.hours} h respecto a los días laborables: es como cambiar de huso horario cada semana. Se asocia a peor ánimo, más somnolencia y mayor riesgo metabólico. Intenta que la diferencia sea menor de 1 h: no retrases tanto el horario el fin de semana y busca luz natural por la mañana.`,
      priority: sj.hours >= 2 ? 'media' : 'baja',
      category: 'Horario',
      source: 'Wittmann et al., Chronobiol Int 2006; Roenneberg et al., Curr Biol 2012',
    });
  }

  if (p.rmeq) {
    const c = chronotype(p.rmeq.score);
    recs.push({
      id: 'chronotype',
      title: `Aprovecha tu cronotipo: ${c.short}`,
      body: `${c.detail} ${c.window} ${
        p.rmeq.score <= 11
          ? 'Si tus obligaciones exigen madrugar, exponte a luz natural intensa al despertar y reduce la luz por la noche: ayuda a adelantar tu reloj interno.'
          : 'Protege tu hora de acostarte temprano; las actividades nocturnas tardías te restan más descanso que a otros.'
      }`,
      priority: 'baja',
      category: 'Horario',
      source: 'Adan & Almirall, Pers Individ Dif 1991; Roenneberg et al., Curr Biol 2012',
    });
  }

  // ---- Habits ---------------------------------------------------------------
  const caffeine = factorImpact(recent, 'caffeine');
  if (recent.some((n) => n.factors.includes('caffeine'))) {
    recs.push({
      id: 'caffeine',
      title: 'Adelanta tu último café',
      body: `${caffeine && caffeine.withSleep < caffeine.withoutSleep - 15 ? `Las noches con cafeína tardía dormiste ${Math.round(caffeine.withoutSleep - caffeine.withSleep)} min menos. ` : ''}La cafeína tiene una vida media de 5–6 horas: un café a las 17 h aún está activo a medianoche. Incluso tomada 6 h antes de dormir puede reducir más de 1 h de sueño. Límite sugerido: antes de las 14 h.`,
      priority: 'media',
      category: 'Hábitos',
      source: 'Drake et al., J Clin Sleep Med 2013',
    });
  }

  if (recent.some((n) => n.factors.includes('screens'))) {
    recs.push({
      id: 'screens',
      title: 'Reduce la luz de pantallas por la noche',
      body: 'La luz de pantallas por la noche retrasa la liberación de melatonina, alarga el tiempo para dormirte y reduce el estado de alerta matutino. Deja el móvil 30–60 min antes de acostarte o usa modo nocturno y brillo mínimo.',
      priority: 'baja',
      category: 'Hábitos',
      source: 'Chang et al., PNAS 2015',
    });
  }

  if (recent.some((n) => n.factors.includes('heavyMeal'))) {
    recs.push({
      id: 'meal',
      title: 'Cena al menos 2–3 h antes de acostarte',
      body: 'Las cenas copiosas y tardías favorecen el reflujo y una digestión activa durante la noche, lo que fragmenta el sueño. Una cena ligera y temprana mejora la continuidad del sueño.',
      priority: 'baja',
      category: 'Hábitos',
      source: 'Fujiwara et al., Am J Gastroenterol 2005; St-Onge et al., Adv Nutr 2016',
    });
  }

  const latencyNights = recent.filter((n) => (n.survey?.latencyMin ?? 0) >= 30).length;
  if (latencyNights >= 3 || recent.some((n) => n.factors.includes('stress'))) {
    recs.push({
      id: 'insomnia',
      title: latencyNights >= 3 ? 'Te cuesta conciliar el sueño' : 'Gestiona el estrés antes de dormir',
      body: `${latencyNights >= 3 ? `En ${latencyNights} noches tardaste 30 min o más en dormirte. ` : ''}Técnicas con evidencia: si no te duermes en ~20 min, levántate y haz algo tranquilo con luz tenue hasta tener sueño (control de estímulos); usa la cama solo para dormir; practica respiración lenta o escribe tus preocupaciones antes de acostarte. Si persiste más de 3 meses, la terapia cognitivo-conductual para el insomnio (TCC-I) es el tratamiento de primera elección.`,
      priority: latencyNights >= 3 ? 'media' : 'baja',
      category: 'Hábitos',
      source: 'Qaseem et al., Ann Intern Med 2016 (ACP guideline); Edinger et al., J Clin Sleep Med 2021',
    });
  }

  if (!recent.some((n) => n.factors.includes('exercise')) && recent.length >= 5) {
    recs.push({
      id: 'exercise',
      title: 'Muévete durante el día',
      body: 'No has registrado ejercicio en tus últimas noches. El ejercicio regular mejora la calidad del sueño y reduce el tiempo para dormirse; también puede disminuir la severidad del ronquido y la apnea. Evita solo el ejercicio muy intenso en la última hora antes de acostarte.',
      priority: 'baja',
      category: 'Hábitos',
      source: 'Kredlow et al., J Behav Med 2015; Stutz et al., Sports Med 2019',
    });
  }

  // ---- Environment ----------------------------------------------------------
  const baseline = avg(recent.map((n) => n.metrics.baselineDb).filter((b) => b > 0));
  const noisy = avg(recent.map((n) => n.metrics.noiseEvents));
  if (has && (baseline > 40 || noisy > 15)) {
    recs.push({
      id: 'noise',
      title: 'Tu dormitorio parece ruidoso',
      body: `Ruido de fondo estimado: ~${Math.round(baseline)} dB, con ${Math.round(noisy)} ruidos prolongados por noche. La OMS recomienda niveles nocturnos bajos (≈30 dB dentro del dormitorio) para no alterar el sueño. Prueba tapones, cerrar ventanas o un ruido blanco/rosa constante para enmascarar ruidos. (El micrófono del móvil no está calibrado: valores aproximados.)`,
      priority: 'baja',
      category: 'Ambiente',
      source: 'WHO Night Noise Guidelines for Europe, 2009',
    });
  }

  const acc = detectionAccuracy(recent);
  if (acc.reviewed >= 5 && acc.other / acc.reviewed >= 0.3) {
    recs.push({
      id: 'partner',
      title: 'Parte de los ronquidos son de otra persona',
      body: `Marcaste ${acc.other} de ${acc.reviewed} episodios revisados como ronquidos de otra persona. Coloca el teléfono más cerca de tu cabeza y más lejos de tu acompañante para que el análisis refleje mejor tu sueño. Si esa persona ronca fuerte, las mismas recomendaciones (dormir de lado, evitar alcohol) también le servirían.`,
      priority: 'media',
      category: 'Ambiente',
      source: 'Noctua (tus revisiones)',
    });
  }

  const lowCoverage = recent.filter((n) => n.metrics.coveragePct != null && n.metrics.coveragePct < 80).length;
  if (lowCoverage >= 2) {
    recs.push({
      id: 'coverage',
      title: 'El análisis se pausó en varias noches',
      body: `En ${lowCoverage} noches se analizó menos del 80% del tiempo, probablemente porque la pantalla se bloqueó o la app pasó a segundo plano. Deja Noctua abierta en modo noche (la pantalla se apaga casi por completo) y desactiva el ahorro de energía para obtener informes completos.`,
      priority: 'media',
      category: 'Ambiente',
      source: 'Noctua',
    });
  }

  if (!has) {
    recs.push({
      id: 'start',
      title: `${name}, registra tu primera noche`,
      body: 'Coloca el teléfono en la mesita, a 0,5–1 m de tu cabeza, conectado al cargador y con la pantalla hacia abajo. Cuantas más noches registres, más personalizados serán tus consejos.',
      priority: 'media',
      category: 'Hábitos',
      source: 'Noctua',
    });
  }

  recs.push({
    id: 'environment',
    title: 'Dormitorio fresco, oscuro y silencioso',
    body: 'Una temperatura de ~17–20 °C, oscuridad total (cortinas opacas o antifaz) y silencio favorecen el sueño profundo. Reserva la cama para dormir.',
    priority: 'baja',
    category: 'Ambiente',
    source: 'Okamoto-Mizuno & Mizuno, J Physiol Anthropol 2012',
  });

  return recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

/** Short, night-specific observations for a single report. */
export function nightInsights(n: Night, p: Profile): string[] {
  const out: string[] = [];
  const m = n.metrics;
  const rec = recommendedSleep(ageOf(p));
  const sleepH = (n.survey ? m.durationMin - n.survey.latencyMin : m.sleepMin) / 60;

  if (sleepH < rec.min) out.push(`Dormiste unas ${sleepH.toFixed(1)} h, por debajo de las ${rec.min}–${rec.max} h recomendadas para tu edad.`);
  else if (sleepH <= rec.max + 1) out.push(`Tu duración de sueño (${sleepH.toFixed(1)} h) está dentro del rango recomendado para tu edad.`);

  if (m.snorePct >= 10) {
    out.push(`Roncaste aproximadamente ${Math.round(m.snoreMin)} min (${m.snorePct.toFixed(0)}% de la noche) en ${m.episodes} episodios.`);
    // When during the night did the snoring concentrate?
    const half = Math.floor(n.minutes.length / 2);
    const first = n.minutes.slice(0, half).reduce((a, x) => a + x.snoreSec, 0);
    const second = n.minutes.slice(half).reduce((a, x) => a + x.snoreSec, 0);
    if (second > first * 1.5)
      out.push('El ronquido se concentró en la segunda mitad de la noche, cuando predomina el sueño REM y la relajación muscular es mayor.');
    else if (first > second * 1.5)
      out.push('El ronquido se concentró en la primera mitad de la noche, cuando predomina el sueño profundo (N3).');
  } else if (m.snoreCount > 0) {
    out.push('Hubo ronquido ocasional, sin periodos prolongados.');
  } else {
    out.push('No detectamos ronquido relevante esta noche.');
  }

  if (m.pauses > 0)
    out.push(`Detectamos ${m.pauses} posibles pausas respiratorias (silencios de 10+ s seguidos de un ronquido fuerte). Es solo una señal orientativa, no un diagnóstico.`);

  const used = n.factors.map(factorLabel);
  if (used.length) out.push(`Factores registrados: ${used.join(', ').toLowerCase()}.`);

  if (m.noiseEvents > 10) out.push(`Hubo ${m.noiseEvents} ruidos prolongados que pudieron fragmentar tu sueño.`);
  if (m.coveragePct != null && m.coveragePct < 90)
    out.push(
      `Se analizó el ${Math.round(m.coveragePct)}% de la noche (${Math.round(m.gapMin ?? 0)} min sin datos). Las cifras pueden subestimar el ronquido real.`,
    );
  if (n.interruptions) out.push(`El sistema interrumpió el micrófono ${n.interruptions} ${n.interruptions === 1 ? 'vez' : 'veces'}; Noctua lo reanudó automáticamente.`);
  return out;
}
