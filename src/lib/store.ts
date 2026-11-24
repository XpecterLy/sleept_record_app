import { useSyncExternalStore } from 'react';

import { deleteFileUri, fileSize, readJSON, removeKey, writeJSON } from './storage';
import type { MorningSurvey, Night, NightSummary, Profile, Settings, SnoreFeedback } from './types';

interface State {
  profile: Profile | null;
  settings: Settings;
  nights: NightSummary[]; // newest first
}

const DEFAULT_SETTINGS: Settings = { sensitivity: 'normal', keepAudio: true, audioNights: 7 };

let state: State = {
  profile: readJSON<Profile>('profile'),
  settings: { ...DEFAULT_SETTINGS, ...(readJSON<Settings>('settings') ?? {}) },
  nights: (readJSON<NightSummary[]>('nights') ?? []).sort((a, b) => b.start - a.start),
};

const listeners = new Set<() => void>();
function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export const getState = () => state;

// ---------- profile & settings ----------
export function saveProfile(profile: Profile) {
  writeJSON('profile', profile);
  emit({ profile });
}

export function updateProfile(patch: Partial<Profile>) {
  if (!state.profile) return;
  saveProfile({ ...state.profile, ...patch });
}

export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch };
  writeJSON('settings', settings);
  emit({ settings });
}

// ---------- nights ----------
function toSummary(n: Night): NightSummary {
  return {
    id: n.id,
    start: n.start,
    end: n.end,
    factors: n.factors,
    metrics: n.metrics,
    survey: n.survey,
    hasAudio: !!n.audioUri,
    interrupted: n.interrupted,
    interruptions: n.interruptions,
    battery: n.battery,
    feedbackCounts: countFeedback(n.feedback),
  };
}

function countFeedback(f: Night['feedback']) {
  const c = { snore: 0, other: 0, notSnore: 0 };
  Object.values(f ?? {}).forEach((v) => (c[v] += 1));
  return c;
}

/** Marks a detected snore episode as confirmed / someone else / not a snore. */
export function setEpisodeFeedback(id: string, episodeStart: number, value: SnoreFeedback | null) {
  const n = getNight(id);
  if (!n) return;
  const feedback = { ...(n.feedback ?? {}) };
  if (value) feedback[String(episodeStart)] = value;
  else delete feedback[String(episodeStart)];
  saveNight({ ...n, feedback });
}

/**
 * Real-world precision of the detector measured with the user's own reviews:
 * share of reviewed episodes that were really snoring (own or someone else's).
 */
export function detectionAccuracy(nights: NightSummary[]) {
  const total = { snore: 0, other: 0, notSnore: 0 };
  nights.forEach((n) => {
    const c = n.feedbackCounts;
    if (!c) return;
    total.snore += c.snore;
    total.other += c.other;
    total.notSnore += c.notSnore;
  });
  const reviewed = total.snore + total.other + total.notSnore;
  return {
    ...total,
    reviewed,
    /** any real snore (own or other person) */
    precision: reviewed ? (total.snore + total.other) / reviewed : null,
    /** snores that belong to the user */
    ownShare: reviewed ? total.snore / reviewed : null,
  };
}

function persistIndex(nights: NightSummary[]) {
  writeJSON('nights', nights);
  emit({ nights });
}

const nightCache = new Map<string, Night>();

export function getNight(id: string): Night | null {
  if (nightCache.has(id)) return nightCache.get(id)!;
  const n = readJSON<Night>(`night-${id}`);
  if (n) nightCache.set(id, n);
  return n;
}

export function saveNight(night: Night) {
  writeJSON(`night-${night.id}`, night);
  nightCache.set(night.id, night);
  const others = state.nights.filter((n) => n.id !== night.id);
  const nights = [toSummary(night), ...others].sort((a, b) => b.start - a.start);
  persistIndex(nights);
  pruneAudio(nights);
}

/** Nights whose audio would be removed if only the newest `limit` are kept. */
export function audioBeyondLimit(limit: number, nights = state.nights) {
  if (limit <= 0) return [];
  return nights.filter((n) => n.hasAudio).slice(limit);
}

/** Removes audio from nights older than the most recent `settings.audioNights`. */
function pruneAudio(nights: NightSummary[]) {
  audioBeyondLimit(state.settings.audioNights, nights).forEach((s) => deleteNightAudio(s.id));
}

export interface AudioItem {
  id: string;
  start: number;
  bytes: number;
  durationMin: number;
  snoreCount: number;
  episodes: number;
  reviewed: number;
}

/** Recordings currently stored, newest first, with their real size on disk. */
export function audioInventory(nights = state.nights): AudioItem[] {
  return nights
    .filter((n) => n.hasAudio)
    .map((n) => {
      const full = getNight(n.id);
      const c = n.feedbackCounts;
      return {
        id: n.id,
        start: n.start,
        bytes: fileSize(full?.audioUri),
        durationMin: n.metrics.durationMin,
        snoreCount: n.metrics.snoreCount,
        episodes: n.metrics.episodes,
        reviewed: c ? c.snore + c.other + c.notSnore : 0,
      };
    });
}

/** Deletes the audio of several nights; reports, charts and metrics are kept. */
export function deleteAudioFor(ids: string[]) {
  ids.forEach(deleteNightAudio);
}

/** Changes how many nights keep audio, pruning older recordings right away. */
export function setAudioNights(limit: number) {
  updateSettings({ audioNights: limit });
  pruneAudio(state.nights);
}

export function saveSurvey(id: string, survey: MorningSurvey) {
  const n = getNight(id);
  if (n) saveNight({ ...n, survey });
}

export function deleteNightAudio(id: string) {
  const n = getNight(id);
  if (!n || !n.audioUri) return;
  deleteFileUri(n.audioUri);
  saveNight({ ...n, audioUri: null, hasAudio: false });
}

export function deleteNight(id: string) {
  const n = getNight(id);
  if (n) deleteFileUri(n.audioUri);
  removeKey(`night-${id}`);
  nightCache.delete(id);
  persistIndex(state.nights.filter((x) => x.id !== id));
}

export function deleteAllData() {
  state.nights.forEach((n) => {
    const full = getNight(n.id);
    deleteFileUri(full?.audioUri);
    removeKey(`night-${n.id}`);
  });
  nightCache.clear();
  removeKey('nights');
  removeKey('profile');
  removeKey('settings');
  removeKey('draft');
  emit({ profile: null, nights: [], settings: DEFAULT_SETTINGS });
}
