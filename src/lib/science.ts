import type { NightSummary, Profile } from './types';

// ---------------------------------------------------------------------------
// Basic anthropometrics
// ---------------------------------------------------------------------------
export const ageOf = (p: Profile) => new Date().getFullYear() - p.birthYear;

export function bmiOf(p: Profile): number | null {
  if (!p.heightCm || !p.weightKg) return null;
  const m = p.heightCm / 100;
  return Math.round((p.weightKg / (m * m)) * 10) / 10;
}

/** WHO adult BMI categories. */
export function bmiCategory(bmi: number) {
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidad grado I';
  if (bmi < 40) return 'Obesidad grado II';
  return 'Obesidad grado III';
}

/**
 * Recommended sleep hours by age.
 * National Sleep Foundation consensus (Hirshkowitz et al., Sleep Health 2015);
 * AASM/SRS adult recommendation ≥7 h (Watson et al., Sleep 2015).
 */
export function recommendedSleep(age: number): { min: number; max: number; group: string } {
  if (age < 18) return { min: 8, max: 10, group: 'adolescentes (14–17 años)' };
  if (age < 26) return { min: 7, max: 9, group: 'adultos jóvenes (18–25 años)' };
  if (age < 65) return { min: 7, max: 9, group: 'adultos (26–64 años)' };
  return { min: 7, max: 8, group: 'adultos mayores (65+ años)' };
}

// ---------------------------------------------------------------------------
// Snoring classification
// ---------------------------------------------------------------------------
export type Level = 'good' | 'warning' | 'critical';

export function snoreLevel(pct: number): { label: string; level: Level } {
  if (pct < 5) return { label: 'Mínimo', level: 'good' };
  if (pct < 20) return { label: 'Leve', level: 'good' };
  if (pct < 40) return { label: 'Moderado', level: 'warning' };
  return { label: 'Alto', level: 'critical' };
}

/** Rough loudness descriptor for estimated dB values (uncalibrated mic). */
export function loudnessLabel(db: number) {
  if (db <= 0) return '—';
  if (db < 45) return 'Suave';
  if (db < 55) return 'Moderado';
  if (db < 65) return 'Fuerte';
  return 'Muy fuerte';
}

/**
 * Habitual snoring: snoring on ≥3 nights per week (definition used in
 * epidemiological studies, e.g. Young et al., NEJM 1993).
 * A night counts as "snoring night" when ≥10 % of the time had snoring.
 */
export function snoringNightsRatio(nights: NightSummary[]) {
  const recent = nights.slice(0, 14);
  if (!recent.length) return null;
  const snoring = recent.filter((n) => n.metrics.snorePct >= 10).length;
  return { snoring, total: recent.length, ratio: snoring / recent.length };
}

export function snorerProfile(nights: NightSummary[]) {
  const r = snoringNightsRatio(nights);
  if (!r || r.total < 3) return { label: 'Aún sin datos suficientes', detail: 'Registra al menos 3 noches.' };
  const perWeek = r.ratio * 7;
  if (perWeek >= 3)
    return { label: 'Roncador habitual', detail: `Ronquido en ${r.snoring} de ${r.total} noches (≥3 noches/semana).` };
  if (r.snoring > 0)
    return { label: 'Roncador ocasional', detail: `Ronquido en ${r.snoring} de ${r.total} noches.` };
  return { label: 'No roncador', detail: `Sin ronquido relevante en ${r.total} noches.` };
}

// ---------------------------------------------------------------------------
// STOP-BANG (Chung et al., Anesthesiology 2008; Chest 2016)
// ---------------------------------------------------------------------------
export interface StopBang {
  score: number;
  items: { key: string; label: string; positive: boolean | null }[];
  risk: 'Bajo' | 'Intermedio' | 'Alto';
  level: Level;
  missing: string[];
}

export function stopBang(p: Profile, nights: NightSummary[]): StopBang {
  const age = ageOf(p);
  const bmi = bmiOf(p);
  const r = snoringNightsRatio(nights);
  const measuredLoud = !!r && r.total >= 3 && r.ratio >= 3 / 7;
  const items = [
    { key: 'S', label: 'Ronquido fuerte (reportado o medido)', positive: !!p.reportedSnoring || measuredLoud },
    { key: 'T', label: 'Cansancio o somnolencia diurna', positive: p.daytimeTiredness ?? null },
    { key: 'O', label: 'Pausas respiratorias observadas', positive: p.observedApnea ?? null },
    { key: 'P', label: 'Presión arterial alta', positive: p.hypertension ?? null },
    { key: 'B', label: 'IMC > 35', positive: bmi == null ? null : bmi > 35 },
    { key: 'A', label: 'Edad > 50 años', positive: age > 50 },
    { key: 'N', label: 'Cuello > 40 cm', positive: p.neckCm ? p.neckCm > 40 : null },
    { key: 'G', label: 'Sexo masculino', positive: p.sex === 'male' },
  ];
  const score = items.filter((i) => i.positive).length;
  const missing = items.filter((i) => i.positive === null).map((i) => i.label);
  // Chung 2016 refinement: score 2 + (male or BMI>35 or neck>40) → high risk too.
  const sbtPositive = ['S', 'T', 'O', 'P'].filter((k) => items.find((i) => i.key === k)?.positive).length;
  const highCombo =
    sbtPositive >= 2 &&
    (p.sex === 'male' || (bmi ?? 0) > 35 || (p.neckCm ?? 0) > 40);
  const risk = score >= 5 || highCombo ? 'Alto' : score >= 3 ? 'Intermedio' : 'Bajo';
  return {
    score,
    items,
    risk,
    level: risk === 'Alto' ? 'critical' : risk === 'Intermedio' ? 'warning' : 'good',
    missing,
  };
}

// ---------------------------------------------------------------------------
// Epworth Sleepiness Scale (Johns, Sleep 1991)
// ---------------------------------------------------------------------------
export const ESS_ITEMS = [
  'Sentado leyendo',
  'Viendo la televisión',
  'Sentado, inactivo, en un lugar público (cine, reunión)',
  'Como pasajero en un coche durante una hora sin paradas',
  'Acostado por la tarde para descansar, si las circunstancias lo permiten',
  'Sentado conversando con alguien',
  'Sentado tranquilamente después de una comida sin alcohol',
  'En un coche, detenido unos minutos por el tráfico',
];
export const ESS_OPTIONS = [
  { value: 0, label: 'Nunca me dormiría' },
  { value: 1, label: 'Baja probabilidad' },
  { value: 2, label: 'Probabilidad moderada' },
  { value: 3, label: 'Alta probabilidad' },
];

export function essInterpretation(score: number): { label: string; level: Level; detail: string } {
  if (score <= 10)
    return { label: 'Somnolencia normal', level: 'good', detail: 'Tu nivel de somnolencia diurna está en rango normal (0–10).' };
  if (score <= 12)
    return { label: 'Somnolencia leve', level: 'warning', detail: 'Somnolencia diurna excesiva leve (11–12).' };
  if (score <= 15)
    return { label: 'Somnolencia moderada', level: 'warning', detail: 'Somnolencia diurna excesiva moderada (13–15).' };
  return { label: 'Somnolencia severa', level: 'critical', detail: 'Somnolencia diurna excesiva severa (16–24). Consulta a un profesional.' };
}

// ---------------------------------------------------------------------------
// Reduced Morningness–Eveningness Questionnaire (Adan & Almirall, 1991)
// ---------------------------------------------------------------------------
export const RMEQ_ITEMS: { q: string; options: { label: string; value: number }[] }[] = [
  {
    q: 'Si pudieras planificar tu día libremente, ¿a qué hora te levantarías?',
    options: [
      { label: '05:00 – 06:30', value: 5 },
      { label: '06:30 – 07:45', value: 4 },
      { label: '07:45 – 09:45', value: 3 },
      { label: '09:45 – 11:00', value: 2 },
      { label: '11:00 – 12:00', value: 1 },
    ],
  },
  {
    q: 'Durante la primera media hora después de despertarte, ¿cómo te sientes?',
    options: [
      { label: 'Muy cansado', value: 1 },
      { label: 'Bastante cansado', value: 2 },
      { label: 'Bastante descansado', value: 3 },
      { label: 'Muy descansado', value: 4 },
    ],
  },
  {
    q: '¿A qué hora de la noche te sientes cansado y con necesidad de dormir?',
    options: [
      { label: '20:00 – 21:00', value: 5 },
      { label: '21:00 – 22:15', value: 4 },
      { label: '22:15 – 00:45', value: 3 },
      { label: '00:45 – 02:00', value: 2 },
      { label: '02:00 – 03:00', value: 1 },
    ],
  },
  {
    q: '¿En qué momento del día crees que alcanzas tu mejor forma?',
    options: [
      { label: '05:00 – 08:00', value: 5 },
      { label: '08:00 – 10:00', value: 4 },
      { label: '10:00 – 17:00', value: 3 },
      { label: '17:00 – 22:00', value: 2 },
      { label: '22:00 – 05:00', value: 1 },
    ],
  },
  {
    q: 'Se habla de personas "matutinas" y "vespertinas". ¿Cuál te consideras?',
    options: [
      { label: 'Claramente matutino', value: 6 },
      { label: 'Más matutino que vespertino', value: 4 },
      { label: 'Más vespertino que matutino', value: 2 },
      { label: 'Claramente vespertino', value: 0 },
    ],
  },
];

export interface Chronotype {
  label: string;
  short: string;
  detail: string;
  window: string;
}

export function chronotype(score: number): Chronotype {
  if (score <= 7)
    return {
      label: 'Vespertino definido',
      short: 'Búho',
      detail: 'Tu reloj biológico tiende a ir tarde: rindes mejor por la tarde-noche y te cuesta madrugar.',
      window: 'Ventana natural aprox.: acostarte 00:30–02:00, despertar 08:30–10:00.',
    };
  if (score <= 11)
    return {
      label: 'Moderadamente vespertino',
      short: 'Búho moderado',
      detail: 'Prefieres horarios algo tardíos. Los horarios tempranos pueden generarte "jet lag social".',
      window: 'Ventana natural aprox.: acostarte 23:30–00:30, despertar 07:30–08:30.',
    };
  if (score <= 17)
    return {
      label: 'Intermedio',
      short: 'Colibrí',
      detail: 'Tu cronotipo es neutro: te adaptas relativamente bien a distintos horarios.',
      window: 'Ventana natural aprox.: acostarte 22:30–23:30, despertar 06:30–07:30.',
    };
  if (score <= 21)
    return {
      label: 'Moderadamente matutino',
      short: 'Alondra moderada',
      detail: 'Rindes mejor por la mañana y te cansas relativamente temprano por la noche.',
      window: 'Ventana natural aprox.: acostarte 22:00–23:00, despertar 06:00–07:00.',
    };
  return {
    label: 'Matutino definido',
    short: 'Alondra',
    detail: 'Tu reloj biológico va adelantado: despiertas temprano con energía y te duermes pronto.',
    window: 'Ventana natural aprox.: acostarte 21:00–22:00, despertar 05:00–06:00.',
  };
}

// ---------------------------------------------------------------------------
// Night score (0–100). Orientative composite, not a clinical index.
// ---------------------------------------------------------------------------
export function nightScore(n: NightSummary, p: Profile | null) {
  const rec = recommendedSleep(p ? ageOf(p) : 30);
  const hours = (n.survey ? Math.max(0, n.metrics.durationMin - n.survey.latencyMin) : n.metrics.sleepMin) / 60;
  // Duration (40): full points inside the recommended range.
  let duration = 40;
  if (hours < rec.min) duration = Math.max(0, 40 - (rec.min - hours) * 13);
  else if (hours > rec.max + 1) duration = Math.max(20, 40 - (hours - rec.max - 1) * 8);
  // Snoring (25)
  const snore = Math.max(0, 25 - n.metrics.snorePct * 0.5 - n.metrics.pausesPerHour * 2);
  // Continuity (15): sustained noises and movement-like transients.
  const continuity = Math.max(0, 15 - n.metrics.noiseEvents * 0.6 - Math.max(0, n.metrics.transientsPerHour - 10) * 0.3);
  // Subjective (20): quality + feeling rested, or neutral if not answered.
  const subjective = n.survey ? ((n.survey.quality + n.survey.rested - 2) / 8) * 20 : 12;
  const score = Math.round(Math.min(100, duration + snore + continuity + subjective));
  return { score, parts: { duration, snore, continuity, subjective }, hours };
}

export function scoreLabel(score: number): { label: string; level: Level } {
  if (score >= 80) return { label: 'Excelente', level: 'good' };
  if (score >= 65) return { label: 'Buena', level: 'good' };
  if (score >= 50) return { label: 'Regular', level: 'warning' };
  return { label: 'Mejorable', level: 'critical' };
}

// ---------------------------------------------------------------------------
// Regularity: SD of bedtime (minutes), handling midnight wrap.
// ---------------------------------------------------------------------------
export function bedtimeStats(nights: NightSummary[]) {
  const recent = nights.slice(0, 14);
  if (recent.length < 3) return null;
  const mins = recent.map((n) => {
    const d = new Date(n.start);
    let m = d.getHours() * 60 + d.getMinutes();
    if (m < 12 * 60) m += 24 * 60; // after midnight → continue the previous evening
    return m;
  });
  const mean = mins.reduce((a, b) => a + b, 0) / mins.length;
  const sd = Math.sqrt(mins.reduce((a, b) => a + (b - mean) ** 2, 0) / mins.length);
  const wake = recent.map((n) => {
    const d = new Date(n.end);
    return d.getHours() * 60 + d.getMinutes();
  });
  const wMean = wake.reduce((a, b) => a + b, 0) / wake.length;
  return { meanBed: mean % (24 * 60), sdBed: sd, meanWake: wMean };
}

export function avg(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

// ---------------------------------------------------------------------------
// Sleep need, debt, social jet lag and bedtime planning
// ---------------------------------------------------------------------------
/** Hours of sleep actually obtained (self-reported latency when available). */
export function sleptHours(n: NightSummary) {
  return (n.survey ? Math.max(0, n.metrics.durationMin - n.survey.latencyMin) : n.metrics.sleepMin) / 60;
}

/** Personal nightly need: low end of the recommended range + 30 min margin. */
export function sleepNeed(p: Profile) {
  const r = recommendedSleep(ageOf(p));
  return Math.min(r.max, r.min + 0.5);
}

/**
 * Accumulated sleep debt over the last 7 days, only counting recorded nights
 * (nights without data are not assumed short). Van Dongen et al., Sleep 2003
 * showed cognitive deficits accumulate with chronic restriction.
 */
export function sleepDebt(nights: NightSummary[], p: Profile, now = Date.now()) {
  const week = nights.filter((n) => now - n.end < 7 * 86_400_000);
  if (!week.length) return null;
  const need = sleepNeed(p);
  const debt = week.reduce((a, n) => a + Math.max(0, need - sleptHours(n)), 0);
  return { debtH: Math.round(debt * 10) / 10, nights: week.length, needH: need };
}

/** Morning date of a night (the day the user wakes up). */
const wakeDay = (n: NightSummary) => new Date(n.end).getDay();
/** Mid-sleep in minutes after 18:00 of the evening the night started. */
function midSleep(n: NightSummary) {
  const s = new Date(n.start);
  let startMin = s.getHours() * 60 + s.getMinutes() - 18 * 60;
  if (startMin < 0) startMin += 24 * 60;
  const latency = n.survey?.latencyMin ?? n.metrics.onsetMin ?? 15;
  const onset = startMin + latency;
  return onset + (sleptHours(n) * 60) / 2;
}

/**
 * Social jet lag = |mid-sleep on free days − mid-sleep on work days|
 * (Wittmann et al., Chronobiol Int 2006; Roenneberg et al., Curr Biol 2012).
 * Free days = nights before Saturday and Sunday.
 */
export function socialJetlag(nights: NightSummary[]) {
  const recent = nights.slice(0, 28);
  const free = recent.filter((n) => wakeDay(n) === 0 || wakeDay(n) === 6);
  const work = recent.filter((n) => wakeDay(n) !== 0 && wakeDay(n) !== 6);
  if (free.length < 1 || work.length < 2) return null;
  const msf = avg(free.map(midSleep));
  const msw = avg(work.map(midSleep));
  const hours = Math.abs(msf - msw) / 60;
  const level: Level = hours < 1 ? 'good' : hours < 2 ? 'warning' : 'critical';
  return {
    hours: Math.round(hours * 10) / 10,
    level,
    label: hours < 1 ? 'Bajo' : hours < 2 ? 'Moderado' : 'Alto',
    msfMin: (msf + 18 * 60) % (24 * 60),
    mswMin: (msw + 18 * 60) % (24 * 60),
    nFree: free.length,
    nWork: work.length,
  };
}

/** Typical minutes to fall asleep for this user (reported > estimated > 15). */
export function typicalLatency(nights: NightSummary[]) {
  const reported = nights.slice(0, 14).filter((n) => n.survey).map((n) => n.survey!.latencyMin);
  if (reported.length >= 2) return Math.round(avg(reported));
  const est = nights
    .slice(0, 14)
    .map((n) => n.metrics.onsetMin)
    .filter((x): x is number => x != null);
  if (est.length >= 2) return Math.round(Math.min(60, avg(est)));
  return 15;
}

/** Bedtime (minutes of day) to wake at `wakeMin` with the recommended sleep. */
export function bedtimePlan(wakeMin: number, p: Profile, nights: NightSummary[]) {
  const r = recommendedSleep(ageOf(p));
  const latency = typicalLatency(nights);
  const at = (h: number) => (wakeMin - h * 60 - latency + 24 * 60 * 2) % (24 * 60);
  return { ideal: at(sleepNeed(p)), earliest: at(r.max), latest: at(r.min), latency, range: r };
}
