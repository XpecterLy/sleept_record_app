import type { NightSummary } from './types';

/** Battery % used per hour on a night spent unplugged (null if not measurable). */
export function batteryPerHour(n: NightSummary): number | null {
  const b = n.battery;
  if (!b || b.charged || n.metrics.durationMin < 60) return null;
  const used = b.startPct - b.endPct;
  if (used < 0) return null;
  return used / (n.metrics.durationMin / 60);
}

/** Typical drain measured on this phone (last 10 unplugged nights of ≥1 h). */
export function typicalDrain(nights: NightSummary[]) {
  const rates = nights
    .map(batteryPerHour)
    .filter((r): r is number => r != null)
    .slice(0, 10);
  if (!rates.length) return null;
  const perHour = rates.reduce((a, b) => a + b, 0) / rates.length;
  return { perHour, per8h: Math.min(100, Math.round(perHour * 8)), nights: rates.length };
}
