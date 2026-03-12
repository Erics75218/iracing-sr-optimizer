/**
 * Golden Path series selection persistence (localStorage).
 *
 * Per-discipline: each discipline (formula, sports-car, oval, dirt-oval, dirt-road) has its own
 * saved list of series IDs to include in the Golden Path.
 * - Key: sr-optimizer-golden-path-{disciplineKey}
 * - Value: JSON array of series IDs to include. [] = all, [0] = none, [id1, id2, ...] = only those.
 *
 * DO NOT duplicate this logic elsewhere. Reading/writing must go through this module.
 */

const STORAGE_KEY_PREFIX = "sr-optimizer-golden-path-";
const LEGACY_FORMULA_KEY = "sr-optimizer-golden-path-included";

function storageKey(disciplineKey: string): string {
  return STORAGE_KEY_PREFIX + disciplineKey;
}

/** Get saved included series IDs for a discipline. Empty array = "all included" (no filter). */
export function getSavedGoldenPathIds(disciplineKey: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const key = storageKey(disciplineKey);
    let raw = window.localStorage.getItem(key);
    if (disciplineKey === "formula" && (raw == null || raw === "")) {
      raw = window.localStorage.getItem(LEGACY_FORMULA_KEY);
      if (raw != null && raw !== "") {
        const parsed = JSON.parse(raw) as unknown;
        const ids = Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number" && Number.isInteger(n)) : [];
        window.localStorage.setItem(key, JSON.stringify(ids));
        window.localStorage.removeItem(LEGACY_FORMULA_KEY);
        return ids;
      }
    }
    if (raw == null || raw === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number" && Number.isInteger(n));
  } catch {
    return [];
  }
}

/** Save included series IDs for a discipline. Call this on every checkbox change before navigating. */
export function setSavedGoldenPathIds(disciplineKey: string, ids: number[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(disciplineKey), JSON.stringify(ids));
  } catch {
    // ignore quota or private mode
  }
}

/** Build ?golden=... query string from saved IDs for a discipline. Empty string = all included (no param). */
export function getSavedGoldenQueryString(disciplineKey: string): string {
  const ids = getSavedGoldenPathIds(disciplineKey);
  if (ids.length === 0) return "";
  return "?" + ids.map((id) => `golden=${encodeURIComponent(id)}`).join("&");
}
