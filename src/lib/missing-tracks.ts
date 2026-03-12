/**
 * Discover schedule tracks that are missing from our track index (no turn_count/length_miles).
 * When merged index is provided (static + API), only tracks still missing after merge are returned.
 * We can then add placeholder entries for those so every schedule track has an index entry (no "missing" list).
 */

import type { Season } from "./iracing-types";
import type { IracingTrackIndexEntry } from "@/data/iracing-track-index";
import { getTrackLayout } from "@/data/track-layouts";

export type MissingTrackItem = {
  track_id: number;
  track_name: string;
  config_name: string | null;
};

const key = (t: MissingTrackItem) => `${t.track_id}:${(t.config_name ?? "").trim()}:${(t.track_name ?? "").trim().toLowerCase()}`;

/**
 * Returns every track+config in the schedule that has no valid data in the index.
 * When trackIndexEntries is provided (e.g. static + API merged), checks against that so API-covered tracks aren't "missing".
 */
export function getScheduleTracksMissingData(
  season: Season | null,
  trackIndexEntries?: IracingTrackIndexEntry[]
): MissingTrackItem[] {
  if (!season?.series?.length) return [];
  const seen = new Set<string>();
  const missing: MissingTrackItem[] = [];

  for (const series of season.series) {
    for (const session of series.sessions ?? []) {
      const t = session.track;
      const layout = getTrackLayout(t.track_id, t.config_name, t.track_name, trackIndexEntries);
      if (layout != null) continue;

      const item: MissingTrackItem = {
        track_id: t.track_id,
        track_name: t.track_name,
        config_name: t.config_name ?? null,
      };
      const k = key(item);
      if (seen.has(k)) continue;
      seen.add(k);
      missing.push(item);
    }
  }

  missing.sort((a, b) => a.track_name.localeCompare(b.track_name) || (a.config_name ?? "").localeCompare(b.config_name ?? ""));
  return missing;
}

/**
 * Build placeholder index entries for missing tracks (turn_count 0, length_miles 1).
 * Merging these into the index means every schedule track has an entry; we treat 0 as "no data" in the UI.
 */
export function placeholderEntriesForMissing(missing: MissingTrackItem[]): IracingTrackIndexEntry[] {
  return missing.map((t) => ({
    track_id: t.track_id,
    track_name: t.track_name,
    config_name: (t.config_name ?? "").trim(),
    turn_count: 0,
    length_miles: 1,
  }));
}

/**
 * Returns merged index plus placeholders for any schedule track still missing.
 * Use this so every track in the schedule has an index entry (no "missing" list).
 */
export function getEffectiveTrackIndex(
  season: Season | null,
  mergedIndex: IracingTrackIndexEntry[]
): IracingTrackIndexEntry[] {
  const stillMissing = getScheduleTracksMissingData(season, mergedIndex);
  const placeholders = placeholderEntriesForMissing(stillMissing);
  return placeholders.length > 0 ? [...mergedIndex, ...placeholders] : mergedIndex;
}
