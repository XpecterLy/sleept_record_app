export type Sex = 'male' | 'female' | 'other';

export interface TestResult {
  score: number;
  date: number;
}

export interface Profile {
  name: string;
  birthYear: number;
  sex: Sex;
  heightCm?: number;
  weightKg?: number;
  neckCm?: number;
  hypertension?: boolean;
  smoker?: boolean;
  /** Someone has seen the user stop breathing / choke during sleep. */
  observedApnea?: boolean;
  /** Someone has told the user they snore loudly. */
  reportedSnoring?: boolean;
  /** Frequently tired / fatigued during the day. */
  daytimeTiredness?: boolean;
  ess?: TestResult;
  rmeq?: TestResult;
  createdAt: number;
}

export type Sensitivity = 'low' | 'normal' | 'high';

export interface Settings {
  sensitivity: Sensitivity;
  keepAudio: boolean;
  /** Keep audio only for the N most recent nights (0 = no limit). */
  audioNights: number;
}

export type PreSleepFactor =
  | 'alcohol'
  | 'caffeine'
  | 'heavyMeal'
  | 'exercise'
  | 'stress'
  | 'congestion'
  | 'sedatives'
  | 'screens'
  | 'nap';

export type MorningSymptom = 'dryMouth' | 'headache' | 'soreThroat' | 'chokingWake';

export interface MorningSurvey {
  quality: number; // 1–5
  rested: number; // 1–5
  latencyMin: number; // self-reported minutes to fall asleep
  awakenings: number;
  symptoms: MorningSymptom[];
}

/** Per-minute acoustic aggregate. Levels are estimated dB (see detector). */
export interface MinuteStat {
  avg: number;
  max: number;
  snoreSec: number;
  noise: number;
  transients: number;
}

export interface SnoreEpisode {
  start: number; // ms from night start
  end: number;
  count: number;
  peakDb: number;
  meanDb: number;
}

export interface SnoreMark {
  t: number; // ms from night start
  dur: number; // ms
  db: number;
}

export interface NoiseMark {
  t: number;
  dur: number;
  db: number;
}

export interface GapMark {
  t: number; // ms from night start
  dur: number; // ms without samples
}

/** User review of a detected snore episode, used to measure real precision. */
export type SnoreFeedback = 'snore' | 'other' | 'notSnore';

export interface PauseMark {
  t: number;
  gapSec: number;
}

export interface NightMetrics {
  durationMin: number;
  onsetMin: number | null;
  sleepMin: number;
  snoreCount: number;
  snoreMin: number;
  snorePct: number;
  episodes: number;
  longestEpisodeMin: number;
  avgSnoreDb: number;
  maxSnoreDb: number;
  noiseEvents: number;
  transientsPerHour: number;
  quietPct: number;
  pauses: number;
  pausesPerHour: number;
  baselineDb: number;
  /** % of the session that was actually analysed (older nights: undefined). */
  coveragePct?: number;
  gapMin?: number;
}

export interface NightSummary {
  id: string;
  start: number;
  end: number;
  factors: PreSleepFactor[];
  metrics: NightMetrics;
  survey?: MorningSurvey;
  hasAudio: boolean;
  interrupted?: boolean;
  /** Recording interruptions recovered during the night. */
  interruptions?: number;
  battery?: BatteryUse;
  feedbackCounts?: { snore: number; other: number; notSnore: number };
}

export interface Night extends NightSummary {
  audioUri: string | null;
  minutes: MinuteStat[];
  episodesList: SnoreEpisode[];
  snores: SnoreMark[];
  noises: NoiseMark[];
  pausesList: PauseMark[];
  gaps?: GapMark[];
  /** keyed by episode start (ms) */
  feedback?: Record<string, SnoreFeedback>;
}

/** Real battery usage measured during a session. */
export interface BatteryUse {
  startPct: number;
  endPct: number;
  /** true if the phone was plugged in at any point (usage not meaningful). */
  charged: boolean;
}
