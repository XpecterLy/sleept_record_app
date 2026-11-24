import * as Battery from 'expo-battery';
import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { Paths } from 'expo-file-system';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { FRAME_MS, SnoreDetector, type DetectorDump, type LiveSnapshot } from './analysis/detector';
import { deleteFileUri, readJSON, removeKey, writeJSON } from './storage';
import { getState, saveNight } from './store';
import type { BatteryUse, Night, PreSleepFactor } from './types';

/**
 * Mono, low bit-rate AAC: ~14 MB per hour is enough to replay snores while
 * keeping a full night manageable. Metering feeds the detector.
 */
const RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  directory: 'document',
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};

/** ~14 MB/h × 10 h + margin. Below this the night is recorded without audio. */
const MIN_FREE_MB_FOR_AUDIO = 300;
const LEVELS_KEPT = 48;

interface Draft {
  id: string;
  start: number;
  factors: PreSleepFactor[];
  audioUri: string | null;
  keepAudio: boolean;
  interruptions: number;
  battery?: BatteryTrack;
  dump: DetectorDump;
}

interface BatteryTrack {
  startPct: number | null;
  lastPct: number | null;
  charged: boolean;
}

const isPlugged = (s: Battery.BatteryState) =>
  s === Battery.BatteryState.CHARGING || s === Battery.BatteryState.FULL;

function toBatteryUse(t: BatteryTrack | undefined, endPct: number | null): BatteryUse | undefined {
  if (!t || t.startPct == null) return undefined;
  const end = endPct ?? t.lastPct;
  if (end == null) return undefined;
  return { startPct: t.startPct, endPct: end, charged: t.charged };
}

async function readBatteryPct(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? Math.round(level * 100) : null;
  } catch {
    return null;
  }
}

export interface Readiness {
  freeMb: number | null;
  audioPossible: boolean;
  batteryLevel: number | null; // 0–1
  charging: boolean | null;
  lowPower: boolean;
}

/** Pre-flight checks shown before starting a night. */
export async function checkReadiness(): Promise<Readiness> {
  let freeMb: number | null = null;
  try {
    if (Platform.OS !== 'web') freeMb = Math.round(Paths.availableDiskSpace / 1024 / 1024);
  } catch {
    freeMb = null;
  }
  let batteryLevel: number | null = null;
  let charging: boolean | null = null;
  let lowPower = false;
  try {
    if (await Battery.isAvailableAsync()) {
      const p = await Battery.getPowerStateAsync();
      batteryLevel = p.batteryLevel >= 0 ? p.batteryLevel : null;
      charging = p.batteryState === Battery.BatteryState.CHARGING || p.batteryState === Battery.BatteryState.FULL;
      lowPower = p.lowPowerMode;
    }
  } catch {
    // battery info is optional
  }
  return { freeMb, audioPossible: freeMb == null || freeMb >= MIN_FREE_MB_FOR_AUDIO, batteryLevel, charging, lowPower };
}

interface SessionContextValue {
  active: boolean;
  startedAt: number | null;
  live: LiveSnapshot | null;
  levels: number[];
  /** true while the recorder is paused by the system (call, other app…) */
  recovering: boolean;
  /**
   * Pause/resume live UI updates (charts, counters). Analysis and recording
   * keep running; pausing only saves CPU/battery while the screen is dimmed.
   */
  setLiveUpdates: (enabled: boolean) => void;
  start: (factors: PreSleepFactor[], opts?: { keepAudio?: boolean }) => Promise<{ audio: boolean }>;
  stop: (save?: boolean) => Promise<string | null>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function buildNight(
  id: string,
  start: number,
  end: number,
  factors: PreSleepFactor[],
  detector: SnoreDetector,
  audioUri: string | null,
  interruptions: number,
  battery: BatteryUse | undefined,
  interrupted = false,
): Night {
  const r = detector.finalize(end);
  return {
    id,
    start,
    end,
    factors,
    metrics: r.metrics,
    hasAudio: !!audioUri,
    audioUri,
    minutes: r.minutes,
    episodesList: r.episodesList,
    snores: r.snores,
    noises: r.noises,
    pausesList: r.pausesList,
    gaps: r.gaps,
    interrupted,
    interruptions,
    battery,
  };
}

/** If the app was killed mid-session, rebuild the night from the last draft. */
function recoverDraft() {
  const draft = readJSON<Draft>('draft');
  if (!draft) return;
  removeKey('draft');
  if (draft.dump.lastT < 10 * 60_000) {
    deleteFileUri(draft.audioUri);
    return;
  }
  const detector = new SnoreDetector(draft.start, getState().settings.sensitivity, draft.dump);
  const audio = draft.keepAudio ? draft.audioUri : null;
  if (!audio) deleteFileUri(draft.audioUri);
  saveNight(
    buildNight(
      draft.id,
      draft.start,
      draft.start + draft.dump.lastT,
      draft.factors,
      detector,
      audio,
      draft.interruptions ?? 0,
      toBatteryUse(draft.battery, null),
      true,
    ),
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS, (status) => {
    if (status.hasError) console.warn('recorder error', status.error);
  });
  const [active, setActive] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [levels, setLevels] = useState<number[]>([]);
  const [recovering, setRecovering] = useState(false);

  const detectorRef = useRef<SnoreDetector | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metaRef = useRef<{ id: string; start: number; factors: PreSleepFactor[]; keepAudio: boolean } | null>(null);
  const interruptionsRef = useRef(0);
  const lastRecoveryRef = useRef(0);
  const stalledRef = useRef(false);
  const liveRef = useRef(true);
  const batteryRef = useRef<BatteryTrack | undefined>(undefined);
  const batterySubRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    recoverDraft();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const saveDraft = () => {
    const meta = metaRef.current;
    const det = detectorRef.current;
    if (!meta || !det) return;
    writeJSON('draft', {
      ...meta,
      audioUri: recorder.uri,
      interruptions: interruptionsRef.current,
      battery: batteryRef.current,
      dump: det.dump(),
    } satisfies Draft);
  };

  /**
   * The OS can pause recording (phone call, another app taking the mic,
   * media-services reset on iOS). Try to resume at most every 10 s.
   */
  const tryRecover = async () => {
    const now = Date.now();
    if (now - lastRecoveryRef.current < 10_000) return;
    lastRecoveryRef.current = now;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      recorder.record();
    } catch (e) {
      console.warn('resume failed', e);
    }
  };

  const tick = (count: number) => {
    const det = detectorRef.current;
    if (!det) return;
    let status: ReturnType<typeof recorder.getStatus> | null = null;
    try {
      status = recorder.getStatus();
    } catch {
      status = null;
    }
    if (!status?.isRecording) {
      if (!stalledRef.current) {
        stalledRef.current = true;
        interruptionsRef.current += 1;
        setRecovering(true);
      }
      tryRecover();
      return;
    }
    if (stalledRef.current) {
      stalledRef.current = false;
      setRecovering(false);
    }
    if (status.metering == null) return;
    det.push(Date.now(), status.metering);
    // UI refresh at ~2 Hz (paused while dimmed); draft persisted every ~60 s.
    if (liveRef.current && count % 2 === 0) {
      const snap = det.snapshot();
      setLive(snap);
      setLevels((prev) => [...prev.slice(-(LEVELS_KEPT - 1)), snap.db]);
    }
    if (count % Math.round(60_000 / FRAME_MS) === 0) saveDraft();
    // Battery level every ~5 min (kept in the draft for crash recovery).
    if (count % Math.round(300_000 / FRAME_MS) === 0) {
      readBatteryPct().then((pct) => {
        if (batteryRef.current && pct != null) batteryRef.current.lastPct = pct;
      });
    }
  };

  const setLiveUpdates = (enabled: boolean) => {
    if (liveRef.current === enabled) return;
    liveRef.current = enabled;
    const det = detectorRef.current;
    if (enabled && det) setLive(det.snapshot()); // refresh immediately on wake
  };

  const startBatteryTracking = async () => {
    const pct = await readBatteryPct();
    let charged = false;
    try {
      charged = isPlugged(await Battery.getBatteryStateAsync());
      batterySubRef.current = Battery.addBatteryStateListener(({ batteryState }) => {
        if (batteryRef.current && isPlugged(batteryState)) batteryRef.current.charged = true;
      });
    } catch {
      // battery info is optional
    }
    batteryRef.current = { startPct: pct, lastPct: pct, charged };
  };

  const start = async (factors: PreSleepFactor[], opts?: { keepAudio?: boolean }) => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('permission');

    const ready = await checkReadiness();
    const keepAudio = (opts?.keepAudio ?? getState().settings.keepAudio) && ready.audioPossible;

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      allowsBackgroundRecording: true,
    });

    const now = Date.now();
    const id = `n${now}`;
    await recorder.prepareToRecordAsync({ fileName: id });
    recorder.record();

    detectorRef.current = new SnoreDetector(now, getState().settings.sensitivity);
    metaRef.current = { id, start: now, factors, keepAudio };
    interruptionsRef.current = 0;
    stalledRef.current = false;
    lastRecoveryRef.current = 0;
    liveRef.current = true;
    await startBatteryTracking();
    setStartedAt(now);
    setActive(true);
    setRecovering(false);
    setLevels([]);

    let count = 0;
    timerRef.current = setInterval(() => tick(++count), FRAME_MS);
    return { audio: keepAudio };
  };

  const stop = async (save = true): Promise<string | null> => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const meta = metaRef.current;
    const det = detectorRef.current;
    batterySubRef.current?.remove();
    batterySubRef.current = null;
    const battery = toBatteryUse(batteryRef.current, await readBatteryPct());
    batteryRef.current = undefined;
    try {
      await recorder.stop();
    } catch (e) {
      console.warn('stop failed', e);
    }
    await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => {});
    removeKey('draft');
    setActive(false);
    setStartedAt(null);
    setLive(null);
    setRecovering(false);
    detectorRef.current = null;
    metaRef.current = null;
    if (!meta || !det) return null;

    const uri = recorder.uri ?? null;
    const keepAudio = save && meta.keepAudio;
    if (!keepAudio) deleteFileUri(uri);
    if (!save) return null;
    saveNight(buildNight(meta.id, meta.start, Date.now(), meta.factors, det, keepAudio ? uri : null, interruptionsRef.current, battery));
    return meta.id;
  };

  return (
    <SessionContext.Provider value={{ active, startedAt, live, levels, recovering, setLiveUpdates, start, stop }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
