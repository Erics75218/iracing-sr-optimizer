/**
 * Track layout lookups: turns per mile, turn count, length.
 *
 * All track data lives in iracing-track-index.ts. This module imports that index
 * and provides getTurnsPerMile, getTrackLayout, and turnsPerMileFromTrack so the
 * rest of the app always uses the same canonical data for any series or discipline.
 */

import { IRACING_TRACK_INDEX, type IracingTrackIndexEntry } from "./iracing-track-index";

/** Re-export for callers that need the row type (e.g. SR calculations). */
export type TrackLayoutRow = IracingTrackIndexEntry;

function idKey(trackId: number, configName: string | null): string {
  return `id:${trackId}:${(configName ?? "").trim()}`;
}

function nameKey(trackName: string, configName: string | null): string {
  return `name:${(trackName ?? "").trim().toLowerCase()}:${(configName ?? "").trim()}`;
}

const layoutById = new Map<string, IracingTrackIndexEntry>();
const layoutByName = new Map<string, IracingTrackIndexEntry>();
for (const row of IRACING_TRACK_INDEX) {
  const config = row.config_name || "";
  if (row.track_id != null) layoutById.set(idKey(row.track_id, config), row);
  if (row.track_name != null) layoutByName.set(nameKey(row.track_name, config), row);
}

function findRow(
  trackId: number,
  trackName: string,
  configName: string | null
): IracingTrackIndexEntry | null {
  const config = (configName ?? "").trim();
  const byId = layoutById.get(idKey(trackId, configName));
  if (byId) return byId;
  let row = layoutByName.get(nameKey(trackName, configName));
  if (row) return row;
  row = layoutByName.get(nameKey(trackName, ""));
  if (row) return row;
  const nameLower = (trackName ?? "").trim().toLowerCase();
  for (const r of IRACING_TRACK_INDEX) {
    if (r.track_name == null) continue;
    if (r.track_name.trim().toLowerCase() !== nameLower) continue;
    const rConfig = (r.config_name ?? "").trim();
    if (rConfig === "" || config === "" || config.startsWith(rConfig) || rConfig.startsWith(config))
      return r;
  }
  return null;
}

/** Same lookup logic over an arbitrary list (e.g. API + static merged). First match wins. */
function findRowInEntries(
  entries: IracingTrackIndexEntry[],
  trackId: number,
  trackName: string,
  configName: string | null
): IracingTrackIndexEntry | null {
  const config = (configName ?? "").trim();
  const nameLower = (trackName ?? "").trim().toLowerCase();
  for (const r of entries) {
    if (r.track_id != null && r.track_id === trackId && (r.config_name ?? "").trim() === config)
      return r;
  }
  for (const r of entries) {
    if (r.track_name == null) continue;
    if (r.track_name.trim().toLowerCase() !== nameLower) continue;
    const rConfig = (r.config_name ?? "").trim();
    if (rConfig === config) return r;
    if (rConfig === "" || config === "") return r;
  }
  for (const r of entries) {
    if (r.track_name == null) continue;
    if (r.track_name.trim().toLowerCase() !== nameLower) continue;
    const rConfig = (r.config_name ?? "").trim();
    if (rConfig === "" || config === "" || config.startsWith(rConfig) || rConfig.startsWith(config))
      return r;
  }
  return null;
}

/**
 * Returns turns per mile for the given track layout, or null if not in the index.
 * Lookup: track_id + config first, then track_name + config (schedule names).
 * When trackIndexEntries is provided (e.g. API + static merged), uses that list so API data wins.
 */
export function getTurnsPerMile(
  trackId: number,
  configName: string | null,
  trackName?: string,
  trackIndexEntries?: IracingTrackIndexEntry[]
): number | null {
  const row = trackIndexEntries
    ? findRowInEntries(trackIndexEntries, trackId, trackName ?? "", configName)
    : findRow(trackId, trackName ?? "", configName);
  if (!row || row.length_miles <= 0 || row.turn_count <= 0) return null;
  return row.turn_count / row.length_miles;
}

/** Use when the API track object already has length_miles and turn_count (prefer over index). */
export function turnsPerMileFromTrack(track: {
  length_miles?: number;
  turn_count?: number;
}): number | null {
  const len = track.length_miles;
  const turns = track.turn_count;
  if (len == null || turns == null || len <= 0) return null;
  return turns / len;
}

/** Raw turn_count and length_miles for a layout from the index (for SR calc, etc.). */
export function getTrackLayout(
  trackId: number,
  configName: string | null,
  trackName?: string,
  trackIndexEntries?: IracingTrackIndexEntry[]
): IracingTrackIndexEntry | null {
  return trackIndexEntries
    ? findRowInEntries(trackIndexEntries, trackId, trackName ?? "", configName)
    : findRow(trackId, trackName ?? "", configName);
}

/**
 * Merge API track entries with the static index. Pass API first so API data wins on lookup.
 * Use when user is connected: fetchIracingTracks(token) then getMergedTrackIndex(apiEntries).
 */
export function getMergedTrackIndex(apiEntries: IracingTrackIndexEntry[]): IracingTrackIndexEntry[] {
  return [...apiEntries, ...IRACING_TRACK_INDEX];
}
