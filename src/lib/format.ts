import type { MorningSymptom, PreSleepFactor } from './types';

export function fmtDuration(min: number) {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return `${h} h ${r.toString().padStart(2, '0')} min`;
}

export function fmtClock(ms: number) {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function fmtMinutesOfDay(min: number) {
  const m = Math.round(((min % 1440) + 1440) % 1440);
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

export function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Night label uses the evening date (a session started at 01:00 belongs to the previous night). */
export function fmtNightDate(start: number) {
  const d = new Date(start);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return `Noche del ${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtShortDate(start: number) {
  const d = new Date(start);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function greeting(name: string) {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Buenos días, ${name}`;
  if (h >= 12 && h < 19) return `Buenas tardes, ${name}`;
  return `Buenas noches, ${name}`;
}

export const FACTORS: { key: PreSleepFactor; label: string; icon: string }[] = [
  { key: 'alcohol', label: 'Alcohol', icon: 'alcohol' },
  { key: 'caffeine', label: 'Cafeína después de las 14 h', icon: 'coffee' },
  { key: 'heavyMeal', label: 'Cena copiosa o tardía', icon: 'meal' },
  { key: 'exercise', label: 'Ejercicio intenso hoy', icon: 'exercise' },
  { key: 'stress', label: 'Estrés o ansiedad', icon: 'stress' },
  { key: 'congestion', label: 'Congestión nasal / alergia', icon: 'congestion' },
  { key: 'sedatives', label: 'Sedantes o somníferos', icon: 'pills' },
  { key: 'screens', label: 'Pantallas antes de dormir', icon: 'phone' },
  { key: 'nap', label: 'Siesta larga hoy', icon: 'nap' },
];

export const factorLabel = (k: PreSleepFactor) => FACTORS.find((f) => f.key === k)?.label ?? k;

export const SYMPTOMS: { key: MorningSymptom; label: string }[] = [
  { key: 'dryMouth', label: 'Boca seca' },
  { key: 'headache', label: 'Dolor de cabeza' },
  { key: 'soreThroat', label: 'Garganta irritada' },
  { key: 'chokingWake', label: 'Desperté ahogándome' },
];

export function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** Approximate audio size: mono AAC 32 kbps ≈ 14 MB per hour. */
export const AUDIO_MB_PER_HOUR = 14;
