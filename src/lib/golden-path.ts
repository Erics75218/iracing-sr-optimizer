/**
 * Golden path: for each race week, pick the single race (within a discipline) that
 * maximizes Safety Rating gain with 0 incidents (highest total corners).
 * One row per week = the "best" race to run that week.
 */

import type { Series, Session } from "./iracing-types";

export type GoldenPathRow = {
  race_week_num: number;
  series_name: string;
  track_name: string;
  track_config: string | null;
  potentialCorners: number;
  cornersPerMile?: number;
};

/** Minimal type for track layout lookup (avoids pulling in data layer). */
type TrackLayoutRow = { turn_count?: number; length_miles?: number } | null;

function estimateLaps(
  session: {
    duration_minutes?: number;
    track?: { lap_count?: number; track_id?: number; config_name?: string | null };
  },
  seriesId: number | undefined,
  getAvgLapTimeMs: ((seriesId: number, trackId: number, configName: string | null) => number | null) | undefined
): number {
  const laps = session.track?.lap_count;
  if (laps != null && laps > 0) return laps;
  const mins = session.duration_minutes ?? 20;
  if (seriesId != null && session.track && getAvgLapTimeMs) {
    const trackId = session.track.track_id ?? 0;
    const configName = session.track.config_name ?? null;
    const avgMs = getAvgLapTimeMs(seriesId, trackId, configName);
    if (avgMs != null && avgMs > 0) {
      const lapsFromAvg = (mins * 60 * 1000) / avgMs;
      return Math.max(1, Math.floor(lapsFromAvg));
    }
  }
  return Math.max(5, Math.floor(mins / 2));
}

function getTotalCorners(
  session: {
    track: { track_id: number; track_name: string; config_name: string | null; turn_count?: number; lap_count?: number };
    duration_minutes?: number;
  },
  getTrackLayout: (id: number, config: string | null, name?: string) => TrackLayoutRow,
  seriesId: number | undefined,
  getAvgLapTimeMs: ((seriesId: number, trackId: number, configName: string | null) => number | null) | undefined
): number | null {
  const laps = estimateLaps(session, seriesId, getAvgLapTimeMs);
  const turnCount =
    session.track.turn_count ??
    getTrackLayout(session.track.track_id, session.track.config_name, session.track.track_name)?.turn_count;
  if (turnCount == null || turnCount <= 0) return null;
  const total = laps * turnCount;
  return total <= 0 ? null : total;
}

function getCornersPerMile(
  session: {
    track: { track_id: number; track_name: string; config_name: string | null; turn_count?: number; length_miles?: number };
  },
  getTrackLayout: (id: number, config: string | null, name?: string) => TrackLayoutRow
): number | undefined {
  const t = session.track;
  const turnCount = t.turn_count ?? getTrackLayout(t.track_id, t.config_name, t.track_name)?.turn_count;
  const lengthMiles = t.length_miles ?? getTrackLayout(t.track_id, t.config_name, t.track_name)?.length_miles;
  if (turnCount == null || lengthMiles == null || lengthMiles <= 0 || turnCount <= 0) return undefined;
  return turnCount / lengthMiles;
}

/**
 * Returns one row per race week: the race that week with the highest total corners
 * (best for SR gain with 0 incidents). Works for any list of series (Formula, Sports Car, etc.).
 * Sorted by week ascending.
 */
export function getGoldenPath(
  seriesList: Series[],
  getTrackLayout: (trackId: number, configName: string | null, trackName?: string) => TrackLayoutRow,
  getAvgLapTimeMs?: (seriesId: number, trackId: number, configName: string | null) => number | null
): GoldenPathRow[] {
  const byWeek = new Map<number, { session: Session; series_name: string; corners: number; cornersPerMile?: number }[]>();

  for (const series of seriesList) {
    for (const session of series.sessions ?? []) {
      const corners = getTotalCorners(session, getTrackLayout, series.series_id, getAvgLapTimeMs);
      if (corners == null || corners <= 0) continue;
      const week = session.race_week_num;
      const cornersPerMile = getCornersPerMile(session, getTrackLayout);
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week)!.push({
        session,
        series_name: series.series_name,
        corners,
        cornersPerMile,
      });
    }
  }

  const rows: GoldenPathRow[] = [];
  for (const [week, candidates] of byWeek) {
    const best = candidates.reduce((a, b) => (a.corners >= b.corners ? a : b));
    rows.push({
      race_week_num: week,
      series_name: best.series_name,
      track_name: best.session.track.track_name,
      track_config: best.session.track.config_name ?? null,
      potentialCorners: best.corners,
      cornersPerMile: best.cornersPerMile,
    });
  }
  rows.sort((a, b) => a.race_week_num - b.race_week_num);
  return rows;
}

/**
 * @deprecated Use getGoldenPath. Kept for compatibility.
 */
export function getFormulaGoldenPath(
  formulaSeries: Series[],
  getTrackLayout: (trackId: number, configName: string | null, trackName?: string) => TrackLayoutRow,
  getAvgLapTimeMs?: (seriesId: number, trackId: number, configName: string | null) => number | null
): GoldenPathRow[] {
  return getGoldenPath(formulaSeries, getTrackLayout, getAvgLapTimeMs);
}
