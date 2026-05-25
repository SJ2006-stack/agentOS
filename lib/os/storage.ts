/** Safe localStorage read/write with quota handling. */

export function readStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readStorageJson<T>(key: string, fallback: T): T {
  const raw = readStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorageJson(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (writeStorageItem(key, serialized)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Retry with trimmed payload when quota is exceeded. */
export function writeStorageJsonCapped<T>(
  key: string,
  value: T[],
  cap: number
): boolean {
  const trimmed = value.slice(0, cap);
  if (writeStorageJson(key, trimmed)) return true;
  const half = trimmed.slice(0, Math.max(1, Math.floor(trimmed.length / 2)));
  return writeStorageJson(key, half);
}
