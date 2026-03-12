/**
 * Fetch average lap time per (series, track layout) from iRacing results API.
 * Uses results/search_series; groups by series_id + track_id + config; returns map
 * keyed by "seriesId:trackId:configName" with value in milliseconds.
 */

import { iracingDataGet } from "@/lib/iracing-api";
import type { Season } from "./iracing-types";

/** Key format: "seriesId:trackId:configName" (configName may be ""). Value: avg lap time in ms. */
export type SeriesTrackAvgLapMap = Map<string, number>;

type SearchSeriesRow = {
  subsession_id?: number;
  series_id?: number;
  event_average_lap?: number;
  track?: {
    track_id?: number;
    track_name?: string;
    config_name?: string | null;
  };
};

function toDataArray(raw: unknown): SearchSeriesRow[] {
  if (Array.isArray(raw)) return raw as SearchSeriesRow[];
  if (raw && typeof raw === "object" && "data" in (raw as object))
    return ((raw as { data: unknown }).data as SearchSeriesRow[]) ?? [];
  return [];
}

function rowKey(seriesId: number, trackId: number, configName: string | null): string {
  return `${seriesId}:${trackId}:${(configName ?? "").trim()}`;
}

const CONCURRENCY = 5;

/**
 * Fetch average lap time (ms) per (series, track layout) for the given season.
 * Calls results/search_series per series, dedupes by subsession_id, groups by
 * (series_id, track_id, config_name), averages event_average_lap.
 * Returns a map for use as getAvgLapTimeMs(seriesId, trackId, config) lookup.
 */
export async function fetchSeriesTrackAverageLapTimes(
  token: string,
  season: Season
): Promise<SeriesTrackAvgLapMap> {
  const seriesList = season.series ?? [];
  if (seriesList.length === 0) return new Map();

  const year = season.season_year;
  const quarter = season.season_quarter;
  const acc = new Map<string, number[]>();

  const run = async (seriesId: number) => {
    const result = await iracingDataGet<unknown>("results/search_series", {
      token,
      searchParams: {
        series_id: String(seriesId),
        season_year: String(year),
        season_quarter: String(quarter),
        official_only: "1",
      },
    });
    if (!result.ok) return;
    const rows = toDataArray(result.data);
    const bySubsession = new Map<number, { seriesId: number; trackId: number; configName: string | null; avgLap: number }>();
    for (const r of rows) {
      const subId = r.subsession_id;
      const avgLap = r.event_average_lap;
      if (subId == null || avgLap == null || typeof avgLap !== "number" || avgLap <= 0) continue;
      const sid = r.series_id ?? seriesId;
      const track = r.track;
      const trackId = track?.track_id ?? 0;
      const configName = track?.config_name ?? null;
      if (trackId === 0) continue;
      bySubsession.set(subId, { seriesId: sid, trackId, configName, avgLap });
    }
    for (const { seriesId: sid, trackId, configName, avgLap } of bySubsession.values()) {
      const key = rowKey(sid, trackId, configName);
      const list = acc.get(key);
      if (list == null) acc.set(key, [avgLap]);
      else list.push(avgLap);
    }
  };

  for (let i = 0; i < seriesList.length; i += CONCURRENCY) {
    const batch = seriesList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((s) => run(s.series_id)));
  }

  const map = new Map<string, number>();
  for (const [key, list] of acc) {
    if (list.length > 0)
      map.set(key, list.reduce((a, b) => a + b, 0) / list.length);
  }
  return map;
}

/**
 * Build a lookup (seriesId, trackId, configName) => avg lap time in ms, or null.
 */
export function buildGetAvgLapTimeMs(
  map: SeriesTrackAvgLapMap | null | undefined
): ((seriesId: number, trackId: number, configName: string | null) => number | null) | undefined {
  if (!map || map.size === 0) return undefined;
  return (seriesId: number, trackId: number, configName: string | null) => {
    const key = rowKey(seriesId, trackId, configName);
    const ms = map.get(key) ?? map.get(rowKey(seriesId, trackId, ""));
    return ms != null && ms > 0 ? ms : null;
  };
}
