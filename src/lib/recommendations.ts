/**
 * SR-oriented race recommendations. Uses schedule data and track index to compute
 * total corners in the race, corners per mile, and a 1–5 SR Potential Score.
 * Average incidents per race can be added when statistical data is available.
 */

import type { Season, RaceRecommendation } from "./iracing-types";
import type { IracingTrackIndexEntry } from "@/data/iracing-track-index";

/** Estimate laps: use lap_count when present; else race_duration / avg_lap_time when available; else ~2 min/lap. */
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

/** Total corners in race = laps × turn_count (possible with 0 incidents). */
function getTotalCorners(
  session: {
    track: { track_id: number; track_name: string; config_name: string | null; turn_count?: number; lap_count?: number };
    duration_minutes?: number;
  },
  getTrackLayout: ((id: number, config: string | null, name?: string) => IracingTrackIndexEntry | null) | undefined,
  seriesId: number | undefined,
  getAvgLapTimeMs: ((seriesId: number, trackId: number, configName: string | null) => number | null) | undefined
): number | null {
  const laps = estimateLaps(session, seriesId, getAvgLapTimeMs);
  const turnCount = session.track.turn_count ?? getTrackLayout?.(session.track.track_id, session.track.config_name, session.track.track_name)?.turn_count;
  if (turnCount == null || turnCount <= 0) return null;
  const total = laps * turnCount;
  return total <= 0 ? null : total;
}

/** Corners per mile for the track layout (turn_count / length_miles). */
function getCornersPerMile(
  session: { track: { track_id: number; track_name: string; config_name: string | null; turn_count?: number; length_miles?: number } },
  getTrackLayout: ((id: number, config: string | null, name?: string) => IracingTrackIndexEntry | null) | undefined
): number | undefined {
  const t = session.track;
  const turnCount = t.turn_count ?? getTrackLayout?.(t.track_id, t.config_name, t.track_name)?.turn_count;
  const lengthMiles = t.length_miles ?? getTrackLayout?.(t.track_id, t.config_name, t.track_name)?.length_miles;
  if (turnCount == null || lengthMiles == null || lengthMiles <= 0 || turnCount <= 0) return undefined;
  return turnCount / lengthMiles;
}

/** SR Potential Score 1–5 from total corners only (no subjective risk). */
function getSrPotentialScore(totalCorners: number): number {
  return totalCorners >= 350 ? 5 : totalCorners >= 250 ? 4 : totalCorners >= 150 ? 3 : totalCorners >= 80 ? 2 : 1;
}

/** Legacy score for sort fallback (length + laps). */
function legacyScore(session: { track: { lap_count?: number }; duration_minutes?: number }): number {
  const mins = session.duration_minutes ?? 20;
  const laps = session.track?.lap_count ?? Math.max(5, Math.floor(mins / 2));
  return Math.min(30, Math.floor(mins / 5)) + Math.min(10, Math.floor(laps / 5));
}

function reasonFromScore(score: number, potentialCorners: number | null): string {
  if (potentialCorners != null && potentialCorners >= 250) return "High corner count — strong SR potential";
  if (score >= 4) return "Longer race — more clean corners";
  if (score >= 3) return "Good length for SR";
  return "Standard length";
}

/** True if filter matches API series name (exact or one contains the other). */
function seriesNameMatches(filter: string, apiName: string): boolean {
  const a = filter.trim();
  const b = apiName.trim();
  if (a === b) return true;
  if (b.includes(a) || a.includes(b)) return true;
  return false;
}

export type GetRecommendationsOptions = {
  categoryId?: number;
  /** When provided, only series with these series_ids are included (ID-based filter). */
  seriesIds?: number[];
  seriesNamePattern?: RegExp;
  seriesName?: string;
  limit?: number;
  /** When provided, used to get turn_count for tracks missing it (for potential corners & score). */
  getTrackLayout?: (trackId: number, configName: string | null, trackName?: string) => IracingTrackIndexEntry | null;
  /** When provided, laps are derived from race_duration / avg_lap_time (ms) for this series+track when lap_count is missing. */
  getAvgLapTimeMs?: (seriesId: number, trackId: number, configName: string | null) => number | null;
};

/** Build recommendations from a season. Includes potential corners, risk, and 1–5 SR Potential Score. */
export function getRecommendations(season: Season, options?: GetRecommendationsOptions): RaceRecommendation[] {
  const categoryId = options?.categoryId;
  const seriesIds = options?.seriesIds;
  const seriesNamePattern = options?.seriesNamePattern;
  const seriesName = options?.seriesName?.trim();
  const limit = options?.limit ?? 10;
  const getTrackLayout = options?.getTrackLayout;
  const getAvgLapTimeMs = options?.getAvgLapTimeMs;
  const out: RaceRecommendation[] = [];

  for (const series of season.series ?? []) {
    if (categoryId != null && series.category_id !== categoryId) continue;
    if (seriesIds != null && seriesIds.length > 0 && !seriesIds.includes(series.series_id)) continue;
    if (seriesNamePattern != null && !seriesNamePattern.test(series.series_name)) continue;
    if (seriesName != null && seriesName !== "" && !seriesNameMatches(seriesName, series.series_name)) continue;
    for (const session of series.sessions ?? []) {
      const potentialCorners = getTotalCorners(session, getTrackLayout, series.series_id, getAvgLapTimeMs) ?? undefined;
      const cornersPerMile = getCornersPerMile(session, getTrackLayout);
      const srPotentialScore = potentialCorners != null ? getSrPotentialScore(potentialCorners) : undefined;
      const score = legacyScore(session);
      const reason = reasonFromScore(srPotentialScore ?? 0, potentialCorners ?? null);

      out.push({
        seriesName: series.series_name,
        trackName: session.track.track_name,
        trackConfig: session.track.config_name ?? null,
        raceWeek: session.race_week_num,
        score,
        reason,
        categoryId: series.category_id,
        potentialCorners: potentialCorners ?? undefined,
        cornersPerMile,
        avgIncidentsPerRace: null,
        srPotentialScore,
      });
    }
  }

  out.sort((a, b) => (b.srPotentialScore ?? b.score) - (a.srPotentialScore ?? a.score));
  return out.slice(0, limit);
}
