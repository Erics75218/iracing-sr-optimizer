/**
 * Shared logic for dashboard and license-section pages: fetch schedule (when connected)
 * and return SR recommendations with live/mock metadata.
 */

import { getTrackLayout } from "@/data/track-layouts";
import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";
import { fetchSeriesTrackAverageLapTimes, buildGetAvgLapTimeMs, type SeriesTrackAvgLapMap } from "@/lib/fetch-series-avg-lap";
import { MOCK_SEASON } from "@/lib/mock-schedule";
import { getRecommendations } from "@/lib/recommendations";
import type { RaceRecommendation, Season } from "@/lib/iracing-types";

export type SectionRecommendationsOptions = {
  categoryId?: number;
  /** When provided, only these series_ids are included (ID-based). Preferred over seriesNamePattern. */
  seriesIds?: number[];
  seriesNamePattern?: RegExp;
  seriesName?: string;
  limit?: number;
  /** When provided, use this season and do not call fetchCurrentSeasonSchedule. */
  season?: Season | null;
};

export type SectionRecommendationsResult = {
  recommendations: RaceRecommendation[];
  isMock: boolean;
  hasLiveData: boolean;
  /** Present when live schedule was loaded; for golden path and other uses. */
  season?: Season | null;
  /** Avg lap time (ms) per series+track when live; for laps = duration / avg_lap. */
  avgLapTimeMap?: SeriesTrackAvgLapMap | null;
};

/**
 * Get recommendations for the main dashboard (all categories) or a section (e.g. Formula).
 * When accessToken is present, fetches live schedule and series-track average lap times;
 * laps are then derived from race_duration / avg_lap_time when lap_count is missing.
 */
export async function getSectionRecommendations(
  accessToken: string | null,
  options?: SectionRecommendationsOptions
): Promise<SectionRecommendationsResult> {
  const limit = options?.limit ?? 10;
  const recOptions = { ...options, limit, getTrackLayout };

  let season: Season | null;
  if (options?.season !== undefined) {
    season = options.season;
  } else if (accessToken) {
    season = await fetchCurrentSeasonSchedule(accessToken);
  } else {
    season = null;
  }

  if (!accessToken) {
    return {
      recommendations: getRecommendations(MOCK_SEASON, recOptions),
      isMock: true,
      hasLiveData: false,
    };
  }
  if (!season) {
    return {
      recommendations: getRecommendations(MOCK_SEASON, recOptions),
      isMock: true,
      hasLiveData: true,
    };
  }
  let avgLapTimeMap: SeriesTrackAvgLapMap | null = null;
  try {
    avgLapTimeMap = await fetchSeriesTrackAverageLapTimes(accessToken, season);
  } catch {
    // non-fatal: we still have schedule; laps fall back to duration/2
  }
  const getAvgLapTimeMs = buildGetAvgLapTimeMs(avgLapTimeMap);
  return {
    recommendations: getRecommendations(season, { ...recOptions, getAvgLapTimeMs }),
    isMock: false,
    hasLiveData: true,
    season,
    avgLapTimeMap: avgLapTimeMap ?? null,
  };
}
