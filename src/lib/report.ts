import { factorLabel, fmtDuration, fmtMinutesOfDay, fmtShortDate, SYMPTOMS } from './format';
import {
  ageOf,
  avg,
  bedtimeStats,
  bmiOf,
  chronotype,
  essInterpretation,
  sleptHours,
  snorerProfile,
  stopBang,
} from './science';
import { detectionAccuracy } from './store';
import type { NightSummary, PreSleepFactor, Profile } from './types';

const SEX = { male: 'Hombre', female: 'Mujer', other: 'No indicado' } as const;
const yn = (v?: boolean) => (v == null ? 'sin dato' : v ? 'sí' : 'no');

/**
 * Plain-text summary meant to be shared with a healthcare professional.
 * Only includes measured / reported data plus validated questionnaires.
 */
export function buildDoctorReport(p: Profile, nights: NightSummary[]): string {
  const recent = nights.slice(0, 14);
  const bmi = bmiOf(p);
  const sb = stopBang(p, recent);
  const bt = bedtimeStats(recent);
  const acc = detectionAccuracy(recent);
  const lines: string[] = [];

  lines.push('INFORME DE SUEÑO — Noctua (herramienta de bienestar, no es un dispositivo médico)');
  lines.push(`Generado: ${new Date().toLocaleDateString()}`);
  lines.push('');
  lines.push(`Paciente: ${p.name} · ${ageOf(p)} años · ${SEX[p.sex]}`);
  lines.push(
    `IMC: ${bmi ?? 'sin dato'}${p.neckCm ? ` · cuello ${p.neckCm} cm` : ''} · HTA: ${yn(p.hypertension)} · fumador: ${yn(p.smoker)}`,
  );
  lines.push(
    `Refiere: ronquido fuerte ${yn(p.reportedSnoring)}, apneas presenciadas ${yn(p.observedApnea)}, cansancio diurno ${yn(p.daytimeTiredness)}`,
  );
  lines.push('');
  lines.push('CUESTIONARIOS');
  lines.push(`• STOP-BANG: ${sb.score}/8 (riesgo ${sb.risk.toLowerCase()})${sb.missing.length ? ` — faltan: ${sb.missing.join(', ')}` : ''}`);
  if (p.ess) lines.push(`• Epworth: ${p.ess.score}/24 (${essInterpretation(p.ess.score).label.toLowerCase()})`);
  if (p.rmeq) lines.push(`• Cronotipo rMEQ: ${p.rmeq.score} (${chronotype(p.rmeq.score).label.toLowerCase()})`);
  lines.push('');

  if (!recent.length) {
    lines.push('Sin noches registradas.');
    return lines.join('\n');
  }

  const surveyed = recent.filter((n) => n.survey);
  lines.push(`REGISTRO ACÚSTICO — últimas ${recent.length} noches (${fmtShortDate(recent[recent.length - 1].start)} a ${fmtShortDate(recent[0].start)})`);
  lines.push(`• Tiempo en cama medio: ${fmtDuration(avg(recent.map((n) => n.metrics.durationMin)))}`);
  lines.push(`• Sueño estimado medio: ${avg(recent.map(sleptHours)).toFixed(1)} h`);
  if (bt) lines.push(`• Hora media de acostarse: ${fmtMinutesOfDay(bt.meanBed)} (±${Math.round(bt.sdBed)} min)`);
  lines.push(`• Ronquido: ${avg(recent.map((n) => n.metrics.snorePct)).toFixed(0)}% de la noche de media; perfil: ${snorerProfile(recent).label.toLowerCase()}`);
  lines.push(`• Intensidad media estimada del ronquido: ${Math.round(avg(recent.filter((n) => n.metrics.avgSnoreDb > 0).map((n) => n.metrics.avgSnoreDb)))} dB (micrófono no calibrado)`);
  lines.push(
    `• Silencios ≥10 s dentro de periodos de ronquido seguidos de reanudación fuerte: ${avg(recent.map((n) => n.metrics.pausesPerHour)).toFixed(1)}/h de media; noches con ≥5/h: ${recent.filter((n) => n.metrics.pausesPerHour >= 5).length}`,
  );
  const cov = recent.filter((n) => n.metrics.coveragePct != null);
  if (cov.length) lines.push(`• Cobertura media del análisis: ${Math.round(avg(cov.map((n) => n.metrics.coveragePct!)))}%`);
  if (acc.reviewed) {
    lines.push(
      `• Validación por el usuario: ${acc.reviewed} episodios escuchados; ${Math.round((acc.precision ?? 0) * 100)}% eran ronquido real (${acc.other} de otra persona).`,
    );
  }
  if (surveyed.length) {
    lines.push('');
    lines.push(`PERCEPCIÓN MATUTINA (${surveyed.length} noches)`);
    lines.push(`• Calidad media: ${avg(surveyed.map((n) => n.survey!.quality)).toFixed(1)}/5 · descanso: ${avg(surveyed.map((n) => n.survey!.rested)).toFixed(1)}/5`);
    lines.push(`• Latencia referida: ${Math.round(avg(surveyed.map((n) => n.survey!.latencyMin)))} min · despertares: ${avg(surveyed.map((n) => n.survey!.awakenings)).toFixed(1)}`);
    const sym = SYMPTOMS.map((s) => ({ s, n: surveyed.filter((x) => x.survey!.symptoms.includes(s.key)).length })).filter((x) => x.n);
    if (sym.length) lines.push(`• Síntomas: ${sym.map((x) => `${x.s.label.toLowerCase()} (${x.n} mañanas)`).join(', ')}`);
  }
  const factors = new Map<PreSleepFactor, number>();
  recent.forEach((n) => n.factors.forEach((f) => factors.set(f, (factors.get(f) ?? 0) + 1)));
  if (factors.size) {
    lines.push('');
    lines.push(`FACTORES REGISTRADOS: ${[...factors].map(([f, c]) => `${factorLabel(f).toLowerCase()} (${c})`).join(', ')}`);
  }
  lines.push('');
  lines.push(
    'Método: detección de ronquido por envolvente de nivel sonoro y periodicidad respiratoria con el micrófono del teléfono. No mide flujo aéreo ni saturación de oxígeno; no permite calcular IAH.',
  );
  return lines.join('\n');
}
