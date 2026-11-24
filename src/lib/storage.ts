import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Tiny JSON key/value persistence. Native uses files in the app's document
 * directory (survives restarts, not purged like cache); web uses localStorage.
 */
const isWeb = Platform.OS === 'web';
let dir: Directory | null = null;

function dataDir(): Directory {
  if (!dir) {
    dir = new Directory(Paths.document, 'noctua');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export function readJSON<T>(key: string): T | null {
  try {
    if (isWeb) {
      const raw = globalThis.localStorage?.getItem(`noctua:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const file = new File(dataDir(), `${key}.json`);
    if (!file.exists) return null;
    return JSON.parse(file.textSync()) as T;
  } catch (e) {
    console.warn('readJSON failed', key, e);
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    const raw = JSON.stringify(value);
    if (isWeb) {
      globalThis.localStorage?.setItem(`noctua:${key}`, raw);
      return;
    }
    const file = new File(dataDir(), `${key}.json`);
    if (!file.exists) file.create();
    file.writeSync(raw);
  } catch (e) {
    console.warn('writeJSON failed', key, e);
  }
}

export function removeKey(key: string): void {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(`noctua:${key}`);
      return;
    }
    const file = new File(dataDir(), `${key}.json`);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('removeKey failed', key, e);
  }
}

export function deleteFileUri(uri: string | null | undefined): void {
  if (!uri || isWeb) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('deleteFileUri failed', uri, e);
  }
}

/** Size in bytes of a local file (0 if missing or on web). */
export function fileSize(uri: string | null | undefined): number {
  if (!uri || isWeb) return 0;
  try {
    const file = new File(uri);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

/** Free space on the device in bytes (null if unknown). */
export function freeSpace(): number | null {
  if (isWeb) return null;
  try {
    return Paths.availableDiskSpace;
  } catch {
    return null;
  }
}

export function fileExists(uri: string | null | undefined): boolean {
  if (!uri) return false;
  if (isWeb) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
