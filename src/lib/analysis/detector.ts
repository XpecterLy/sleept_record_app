import type {
  GapMark,
  MinuteStat,
  NightMetrics,
  NoiseMark,
  PauseMark,
  Sensitivity,
  SnoreEpisode,
  SnoreMark,
} from '../types';

/**
 * Real-time snore detector working on the microphone level envelope.
 *
 * Input: the recorder's metering value in dBFS, sampled every ~250 ms
 * (iOS: average power; Android: peak amplitude since last read).
 *
 * Method (inspired by envelope + periodicity approaches in the acoustic snore
 * literature, e.g. Dafna et al. 2013, Jané et al. 2000):
 *  1. Adaptive noise floor = 30th percentile of the last 2 minutes.
 *  2. A sound event starts when the level rises > N dB above that floor.
 *  3. Events of 0.35–4.5 s are "breath-like" candidates. Shorter = transient
 *     (movement, clicks). Longer = sustained noise (speech, TV, traffic).
 *  4. A candidate is classified as SNORE only when it repeats with the rhythm
 *     of breathing during sleep (inter-onset 1.8–10 s, consistent spacing).
 *     This rejects isolated noises that happen to be loud.
 *  5. Snores separated by < 60 s are grouped into episodes.
 *  6. "Possible pause": inside a snoring period, silence of 10–90 s followed by
 *     a louder snore (resumption/gasp pattern). This is only a screening
 *     signal — NOT an apnea diagnosis (that requires polysomnography).
 *
 * dBFS is converted to an *estimated* dB value by adding a fixed offset; phone
 * microphones are not calibrated, so absolute values are approximate.
 */

export const FRAME_MS = 250;
const DB_OFFSET = 90;
const BASELINE_WINDOW = 480; // frames ≈ 2 min
const MIN_EVENT_MS = 350;
const MAX_CANDIDATE_MS = 4500;
const MAX_EVENT_MS = 20_000;
const EPISODE_GAP_MS = 60_000;
const MAX_SNORE_MARKS = 4000;
const MAX_NOISE_MARKS = 600;
/** A silence in the sample stream longer than this is a gap (JS paused, mic taken…). */
const GAP_MS = 3000;

const SENSITIVITY_DB: Record<Sensitivity, number> = { low: 10, normal: 7, high: 5 };

export const toEstimatedDb = (dbfs: number) =>
  Math.max(0, Math.min(110, (Number.isFinite(dbfs) ? dbfs : -160) + DB_OFFSET));

interface Candidate {
  t: number;
  dur: number;
  db: number;
  snore: boolean;
}

export interface LiveSnapshot {
  elapsedMs: number;
  db: number;
  baseline: number;
  snoreCount: number;
  episodes: number;
  snoringNow: boolean;
  noiseEvents: number;
  pauses: number;
}

export interface DetectorResult {
  minutes: MinuteStat[];
  episodesList: SnoreEpisode[];
  snores: SnoreMark[];
  noises: NoiseMark[];
  pausesList: PauseMark[];
  gaps: GapMark[];
  metrics: NightMetrics;
}

export interface DetectorDump {
  start: number;
  minutes: MinuteStat[];
  episodes: SnoreEpisode[];
  snores: SnoreMark[];
  noises: NoiseMark[];
  pauses: PauseMark[];
  baselines: number[];
  lastT: number;
  analyzedMs?: number;
  gaps?: GapMark[];
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

export class SnoreDetector {
  readonly start: number;
  private thresholdDb: number;
  private history: number[] = [];
  private baseline = 30;
  private baselineSamples: number[] = [];
  private lastBaselineAt = 0;
  private lastT = 0;

  // event state
  private inEvent = false;
  private evStart = 0;
  private evLastAbove = 0;
  private evPeak = 0;
  private evSum = 0;
  private evN = 0;
  private below = 0;

  private candidates: Candidate[] = [];
  private minutes: MinuteStat[] = [];
  private minuteSums: { sum: number; n: number }[] = [];
  private snores: SnoreMark[] = [];
  private snoreTotal = 0;
  private noises: NoiseMark[] = [];
  private episodes: SnoreEpisode[] = [];
  private pauses: PauseMark[] = [];
  private lastDb = 0;
  private prevT: number | null = null;
  private analyzedMs = 0;
  private gaps: GapMark[] = [];

  constructor(start: number, sensitivity: Sensitivity = 'normal', dump?: DetectorDump) {
    this.start = start;
    this.thresholdDb = SENSITIVITY_DB[sensitivity];
    if (dump) {
      this.minutes = dump.minutes;
      this.minuteSums = dump.minutes.map((m) => ({ sum: m.avg, n: 1 }));
      this.episodes = dump.episodes;
      this.snores = dump.snores;
      this.snoreTotal = dump.snores.length;
      this.noises = dump.noises;
      this.pauses = dump.pauses;
      this.baselineSamples = dump.baselines;
      this.lastT = dump.lastT;
      this.analyzedMs = dump.analyzedMs ?? dump.lastT;
      this.gaps = dump.gaps ?? [];
    }
  }

  push(now: number, dbfs: number) {
    const t = now - this.start;
    if (t < 0) return;
    if (this.prevT != null) {
      const dt = t - this.prevT;
      if (dt <= 0) return;
      if (dt > GAP_MS) {
        // No samples for a while: close any open event and record the gap so
        // the report can show how much of the night was actually analysed.
        this.closeEvent();
        this.gaps.push({ t: this.prevT, dur: dt });
        this.analyzedMs += FRAME_MS;
      } else {
        this.analyzedMs += dt;
      }
    } else {
      this.analyzedMs += FRAME_MS;
    }
    this.prevT = t;
    this.lastT = t;
    const db = toEstimatedDb(dbfs);
    this.lastDb = db;

    this.addToMinute(t, db);

    this.history.push(db);
    if (this.history.length > BASELINE_WINDOW) this.history.shift();
    if (t - this.lastBaselineAt > 5000 || this.history.length < 20) {
      this.baseline = Math.max(15, percentile(this.history, 0.3));
      this.lastBaselineAt = t;
      if (this.history.length >= 40) this.baselineSamples.push(Math.round(this.baseline));
    }

    const threshold = Math.max(this.baseline + this.thresholdDb, 32);
    const above = db >= threshold && this.history.length >= 20;

    if (above) {
      if (!this.inEvent) {
        this.inEvent = true;
        this.evStart = t;
        this.evPeak = 0;
        this.evSum = 0;
        this.evN = 0;
      }
      this.evLastAbove = t;
      this.evPeak = Math.max(this.evPeak, db);
      this.evSum += db;
      this.evN += 1;
      this.below = 0;
      if (t - this.evStart > MAX_EVENT_MS) this.closeEvent();
    } else if (this.inEvent) {
      this.below += 1;
      if (this.below >= 2) this.closeEvent();
    }
  }

  private addToMinute(t: number, db: number) {
    const idx = Math.floor(t / 60_000);
    while (this.minutes.length <= idx) {
      this.minutes.push({ avg: 0, max: 0, snoreSec: 0, noise: 0, transients: 0 });
      this.minuteSums.push({ sum: 0, n: 0 });
    }
    const s = this.minuteSums[idx];
    s.sum += db;
    s.n += 1;
    const m = this.minutes[idx];
    m.avg = Math.round((s.sum / s.n) * 10) / 10;
    m.max = Math.max(m.max, Math.round(db));
  }

  private minuteAt(t: number) {
    const idx = Math.min(this.minutes.length - 1, Math.max(0, Math.floor(t / 60_000)));
    return this.minutes[idx];
  }

  private closeEvent() {
    if (!this.inEvent) return;
    this.inEvent = false;
    const dur = this.evLastAbove + FRAME_MS - this.evStart;
    const db = Math.round(this.evPeak);
    const t = this.evStart;

    if (dur < MIN_EVENT_MS) {
      const m = this.minuteAt(t);
      if (m) m.transients += 1;
      return;
    }
    if (dur > MAX_CANDIDATE_MS) {
      if (this.noises.length < MAX_NOISE_MARKS) this.noises.push({ t, dur, db });
      const m = this.minuteAt(t);
      if (m) m.noise += 1;
      return;
    }
    const c: Candidate = { t, dur, db, snore: false };
    this.candidates.push(c);
    this.candidates = this.candidates.filter((x) => t - x.t < 60_000);
    this.evaluateRhythm(c);
  }

  private evaluateRhythm(c: Candidate) {
    const recent = this.candidates.slice(-4);
    const lastSnore = this.snores.length ? this.snores[this.snores.length - 1] : null;

    // Continuation of an ongoing snoring train.
    if (lastSnore) {
      const gap = (c.t - lastSnore.t) / 1000;
      if (gap >= 1.8 && gap <= 12) {
        this.markSnore(c);
        return;
      }
    }

    if (recent.length < 3) return;
    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) intervals.push((recent[i].t - recent[i - 1].t) / 1000);
    const inRange = intervals.every((iv) => iv >= 1.8 && iv <= 10);
    if (!inRange) return;
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const sd = Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length);
    if (sd / mean > 0.5) return;
    const lastT = lastSnore ? lastSnore.t : -Infinity;
    recent.forEach((x) => {
      if (!x.snore && x.t > lastT) this.markSnore(x);
    });
  }

  private markSnore(c: Candidate) {
    c.snore = true;
    const prev = this.snores.length ? this.snores[this.snores.length - 1] : null;
    this.snoreTotal += 1;
    if (this.snores.length < MAX_SNORE_MARKS) this.snores.push({ t: c.t, dur: c.dur, db: c.db });
    const m = this.minuteAt(c.t);
    if (m) m.snoreSec = Math.round((m.snoreSec + c.dur / 1000) * 10) / 10;

    const ep = this.episodes[this.episodes.length - 1];
    if (prev && ep) {
      const gapMs = c.t - (prev.t + prev.dur);
      // Possible breathing pause: silence 10–90 s inside a sustained snoring
      // period, followed by a louder-than-usual snore (resumption).
      if (gapMs >= 10_000 && gapMs <= 90_000 && ep.count >= 5 && c.db >= ep.meanDb + 4) {
        this.pauses.push({ t: prev.t + prev.dur, gapSec: Math.round(gapMs / 1000) });
      }
    }
    if (ep && c.t - ep.end <= EPISODE_GAP_MS) {
      ep.meanDb = Math.round(((ep.meanDb * ep.count + c.db) / (ep.count + 1)) * 10) / 10;
      ep.count += 1;
      ep.end = c.t + c.dur;
      ep.peakDb = Math.max(ep.peakDb, c.db);
    } else {
      this.episodes.push({ start: c.t, end: c.t + c.dur, count: 1, peakDb: c.db, meanDb: c.db });
    }
  }

  snapshot(): LiveSnapshot {
    const last = this.snores[this.snores.length - 1];
    return {
      elapsedMs: this.lastT,
      db: Math.round(this.lastDb),
      baseline: Math.round(this.baseline),
      snoreCount: this.snoreTotal,
      episodes: this.episodes.filter((e) => e.count >= 3).length,
      snoringNow: !!last && this.lastT - last.t < 15_000,
      noiseEvents: this.noises.length,
      pauses: this.pauses.length,
    };
  }

  dump(): DetectorDump {
    return {
      start: this.start,
      minutes: this.minutes,
      episodes: this.episodes,
      snores: this.snores,
      noises: this.noises,
      pauses: this.pauses,
      baselines: this.baselineSamples,
      lastT: this.lastT,
      analyzedMs: this.analyzedMs,
      gaps: this.gaps,
    };
  }

  finalize(endMs: number): DetectorResult {
    this.closeEvent();
    const durationMin = Math.max(0, (endMs - this.start) / 60_000);
    // Episodes with fewer than 3 snores are too weak to report.
    const episodes = this.episodes.filter((e) => e.count >= 3);
    const snoreMs = episodes.reduce((a, e) => a + (e.end - e.start), 0);
    const snoreMin = snoreMs / 60_000;
    const longest = episodes.reduce((a, e) => Math.max(a, e.end - e.start), 0) / 60_000;
    const dbs = this.snores.map((s) => s.db);
    const avgSnoreDb = dbs.length ? dbs.reduce((a, b) => a + b, 0) / dbs.length : 0;
    const maxSnoreDb = dbs.length ? Math.max(...dbs) : 0;
    const transients = this.minutes.reduce((a, m) => a + m.transients, 0);
    const quiet = this.minutes.filter(
      (m) => m.avg > 0 && m.snoreSec < 3 && m.noise === 0 && m.transients <= 2,
    ).length;
    const analysedMinutes = this.minutes.filter((m) => m.avg > 0).length;
    const onsetMin = estimateOnset(this.minutes);
    const sleepMin = onsetMin == null ? durationMin : Math.max(0, durationMin - onsetMin);
    const hours = Math.max(durationMin / 60, 1 / 60);
    const sleepHours = Math.max(sleepMin / 60, 1 / 60);

    const metrics: NightMetrics = {
      durationMin: round1(durationMin),
      onsetMin,
      sleepMin: round1(sleepMin),
      snoreCount: this.snoreTotal,
      snoreMin: round1(snoreMin),
      snorePct: round1(durationMin ? (snoreMin / durationMin) * 100 : 0),
      episodes: episodes.length,
      longestEpisodeMin: round1(longest),
      avgSnoreDb: round1(avgSnoreDb),
      maxSnoreDb,
      noiseEvents: this.noises.length,
      transientsPerHour: round1(transients / hours),
      quietPct: round1(analysedMinutes ? (quiet / analysedMinutes) * 100 : 0),
      pauses: this.pauses.length,
      pausesPerHour: round1(this.pauses.length / sleepHours),
      baselineDb: Math.round(percentile(this.baselineSamples, 0.5)),
      coveragePct: round1(durationMin ? Math.min(100, (this.analyzedMs / 60_000 / durationMin) * 100) : 0),
      gapMin: round1(this.gaps.reduce((a, g) => a + g.dur, 0) / 60_000),
    };

    return {
      minutes: this.minutes,
      episodesList: episodes,
      snores: this.snores,
      noises: this.noises,
      pausesList: this.pauses,
      gaps: this.gaps,
      metrics,
    };
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Estimated sleep onset (minutes after start): first moment followed by
 * 15 consecutive "still" minutes (few transients, no sustained noise),
 * or the first snoring minute — whichever comes first. Acoustic proxy only.
 */
export function estimateOnset(minutes: MinuteStat[]): number | null {
  const firstSnore = minutes.findIndex((m) => m.snoreSec >= 3);
  let still = -1;
  for (let i = 0; i + 15 <= minutes.length; i++) {
    let ok = true;
    for (let j = i; j < i + 15; j++) {
      if (minutes[j].avg === 0 || minutes[j].noise > 0 || minutes[j].transients > 3) {
        ok = false;
        break;
      }
    }
    if (ok) {
      still = i;
      break;
    }
  }
  const options = [firstSnore, still].filter((x) => x >= 0);
  return options.length ? Math.min(...options) : null;
}

export type MinuteState = 'calm' | 'snore' | 'active' | 'nodata';

export function minuteState(m: MinuteStat): MinuteState {
  if (m.avg === 0) return 'nodata';
  if (m.snoreSec >= 3) return 'snore';
  if (m.noise > 0 || m.transients > 4) return 'active';
  return 'calm';
}
