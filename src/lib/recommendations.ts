/**
 * SR-oriented race recommendations. Uses schedule data (mock or from API) and
 * scores races by factors that help Safety Rating (e.g. longer races = more
 * time to recover, fixed setup = less variability). When we have real API
 * data we can add corner density or incident data if available.
 */

import type { Season, RaceRecommendation } from "./iracing-types";

/** Score a session for SR-friendliness. Higher = better for gaining SR. */
function scoreSession(session: {
  track: { track_name: string; lap_count?: number };
  duration_minutes?: number;
}): { score: number; reason: string } {
  const mins = session.duration_minutes ?? 20;
  const laps = session.track.lap_count ?? 15;
  // Prefer longer races (more clean laps to offset incidents)
  const lengthScore = Math.min(30, Math.floor(mins / 5)) + Math.min(10, Math.floor(laps / 5));
  const score = lengthScore;
  const reason =
    mins >= 25
      ? "Longer race — more time for clean laps"
      : laps >= 20
        ? "Good lap count for SR"
        : "Standard length";
  return { score, reason };
}

/** Build recommendations from a season (mock or API). Filter by categoryId to match license (road, oval, etc.). */
export function getRecommendations(
  season: Season,
  options?: { categoryId?: number; limit?: number }
): RaceRecommendation[] {
  const categoryId = options?.categoryId;
  const limit = options?.limit ?? 10;
  const out: RaceRecommendation[] = [];

  for (const series of season.series ?? []) {
    if (categoryId != null && series.category_id !== categoryId) continue;
    for (const session of series.sessions ?? []) {
      const { score, reason } = scoreSession(session);
      out.push({
        seriesName: series.series_name,
        trackName: session.track.track_name,
        trackConfig: session.track.config_name ?? null,
        raceWeek: session.race_week_num,
        score,
        reason,
        categoryId: series.category_id,
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
