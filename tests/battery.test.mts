import assert from 'node:assert/strict';
import { test } from 'node:test';

import { batteryPerHour, typicalDrain } from '../src/lib/battery.ts';
import type { NightSummary } from '../src/lib/types.ts';

const night = (hours: number, battery?: NightSummary['battery']): NightSummary =>
  ({ id: 'x', start: 0, end: hours * 3_600_000, factors: [], hasAudio: false, battery, metrics: { durationMin: hours * 60 } }) as NightSummary;

test('battery drain per hour on an unplugged night', () => {
  assert.equal(batteryPerHour(night(8, { startPct: 90, endPct: 70, charged: false })), 2.5);
});

test('nights on the charger or without data are excluded', () => {
  assert.equal(batteryPerHour(night(8, { startPct: 60, endPct: 100, charged: true })), null);
  assert.equal(batteryPerHour(night(8)), null);
  assert.equal(batteryPerHour(night(0.5, { startPct: 90, endPct: 89, charged: false })), null);
});

test('typical drain averages measured nights and projects 8 h', () => {
  const d = typicalDrain([
    night(8, { startPct: 90, endPct: 70, charged: false }), // 2.5 %/h
    night(8, { startPct: 80, endPct: 52, charged: false }), // 3.5 %/h
    night(8, { startPct: 40, endPct: 100, charged: true }),
  ]);
  assert.ok(d);
  assert.equal(d.nights, 2);
  assert.equal(d.per8h, 24);
});
