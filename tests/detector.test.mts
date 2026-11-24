/**
 * Regression tests for the snore detector and the scientific helpers.
 * Run with: npm test   (Node ≥ 23 runs TypeScript directly)
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SnoreDetector } from '../src/lib/analysis/detector.ts';
import { chronotype, essInterpretation, sleepDebt, stopBang } from '../src/lib/science.ts';
import type { NightSummary, Profile } from '../src/lib/types.ts';

const FRAME = 250;

/** Builds a synthetic night by pushing estimated-dB levels every 250 ms. */
function makeNight(sensitivity: 'low' | 'normal' | 'high' = 'normal') {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const d = new SnoreDetector(0, sensitivity);
  let t = 0;
  const emit = (db: number) => {
    d.push(t, db - 90 + (rnd() - 0.5) * 3);
    t += FRAME;
  };
  const api = {
    quiet(sec: number) {
      for (let i = 0; i < sec * 4; i++) emit(28);
      return api;
    },
    snores(n: number, periodSec = 4, db = 50) {
      for (let k = 0; k < n; k++) {
        for (let i = 0; i < 5; i++) emit(db); // 1.25 s snore
        for (let i = 0; i < periodSec * 4 - 5; i++) emit(28);
      }
      return api;
    },
    noise(sec: number, db = 55) {
      for (let i = 0; i < sec * 4; i++) emit(db);
      return api;
    },
    isolated(n: number, gapSec = 45) {
      for (let k = 0; k < n; k++) {
        for (let i = 0; i < 5; i++) emit(50);
        api.quiet(gapSec);
      }
      return api;
    },
    gap(sec: number) {
      t += sec * 1000; // no samples (JS paused)
      return api;
    },
    finish: () => d.finalize(t),
  };
  return api;
}

test('counts rhythmic snores and groups them into one episode', () => {
  const r = makeNight().quiet(20 * 60).snores(150).quiet(10 * 60).finish();
  assert.equal(r.metrics.snoreCount, 150);
  assert.equal(r.metrics.episodes, 1);
  assert.ok(r.metrics.snoreMin > 9 && r.metrics.snoreMin < 11);
});

test('ignores isolated loud sounds that do not follow a breathing rhythm', () => {
  const r = makeNight().quiet(5 * 60).isolated(20).finish();
  assert.equal(r.metrics.snoreCount, 0);
  assert.equal(r.metrics.episodes, 0);
});

test('classifies sustained sounds (speech/TV) as noise, not snoring', () => {
  const r = makeNight().quiet(5 * 60).noise(10).quiet(60).finish();
  assert.equal(r.metrics.snoreCount, 0);
  assert.equal(r.metrics.noiseEvents, 1);
});

test('flags a silence inside snoring followed by a loud snore as a possible pause', () => {
  const r = makeNight().quiet(5 * 60).snores(40).quiet(30).snores(1, 4, 62).snores(20).finish();
  assert.equal(r.metrics.pauses, 1);
  assert.ok(r.pausesList[0].gapSec >= 25 && r.pausesList[0].gapSec <= 40);
});

test('does not flag pauses when snoring simply stops', () => {
  const r = makeNight().quiet(5 * 60).snores(40).quiet(20 * 60).finish();
  assert.equal(r.metrics.pauses, 0);
});

test('reports coverage and gaps when sampling stops', () => {
  const r = makeNight().quiet(30 * 60).gap(30 * 60).quiet(30 * 60).finish();
  assert.equal(r.gaps.length, 1);
  assert.ok(r.metrics.coveragePct! > 60 && r.metrics.coveragePct! < 70, `coverage ${r.metrics.coveragePct}`);
  assert.ok(Math.abs(r.metrics.gapMin! - 30) < 1);
});

test('low sensitivity rejects soft snores that normal sensitivity accepts', () => {
  const soft = (s: 'low' | 'normal') => makeNight(s).quiet(5 * 60).snores(30, 4, 36).finish().metrics.snoreCount;
  assert.ok(soft('normal') > 20);
  assert.equal(soft('low'), 0);
});

// ---------------------------------------------------------------------------
const profile = (p: Partial<Profile>): Profile => ({
  name: 'Test',
  birthYear: new Date().getFullYear() - 40,
  sex: 'female',
  createdAt: 0,
  ...p,
});

test('STOP-BANG scoring and risk bands (Chung 2016)', () => {
  assert.equal(stopBang(profile({}), []).risk, 'Bajo');
  const high = stopBang(
    profile({ sex: 'male', reportedSnoring: true, daytimeTiredness: true, hypertension: true, birthYear: 1960 }),
    [],
  );
  assert.equal(high.score, 5);
  assert.equal(high.risk, 'Alto');
  // 2 of S-T-O-P + male → high risk even with total score 3
  const combo = stopBang(profile({ sex: 'male', reportedSnoring: true, daytimeTiredness: true }), []);
  assert.equal(combo.score, 3);
  assert.equal(combo.risk, 'Alto');
});

test('Epworth and rMEQ interpretation boundaries', () => {
  assert.equal(essInterpretation(10).level, 'good');
  assert.equal(essInterpretation(11).level, 'warning');
  assert.equal(essInterpretation(16).level, 'critical');
  assert.equal(chronotype(7).label, 'Vespertino definido');
  assert.equal(chronotype(12).label, 'Intermedio');
  assert.equal(chronotype(22).label, 'Matutino definido');
});

test('sleep debt only counts recorded nights in the last 7 days', () => {
  const now = Date.now();
  const night = (daysAgo: number, hours: number): NightSummary => ({
    id: String(daysAgo),
    start: now - daysAgo * 86_400_000 - hours * 3_600_000,
    end: now - daysAgo * 86_400_000,
    factors: [],
    hasAudio: false,
    metrics: {
      durationMin: hours * 60,
      onsetMin: 0,
      sleepMin: hours * 60,
      snoreCount: 0,
      snoreMin: 0,
      snorePct: 0,
      episodes: 0,
      longestEpisodeMin: 0,
      avgSnoreDb: 0,
      maxSnoreDb: 0,
      noiseEvents: 0,
      transientsPerHour: 0,
      quietPct: 100,
      pauses: 0,
      pausesPerHour: 0,
      baselineDb: 30,
    },
  });
  const d = sleepDebt([night(1, 6), night(2, 6), night(10, 3)], profile({}), now);
  assert.ok(d);
  assert.equal(d.nights, 2);
  assert.equal(d.debtH, 3); // need 7.5 h for adults → 1.5 h × 2
});
