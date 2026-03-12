/**
 * Fetch current season schedule from iRacing Data API and map to our Season type.
 * Uses series/seasons; series names are resolved via series/get when missing (API often omits series_name in seasons payload).
 * Cached per-request so layout and section pages share the same schedule (avoids Golden Path seeing mock data when layout has live data).
 */

import { cache } from "react";
import { iracingDataGet } from "@/lib/iracing-api";
import type { CategoryId, Season, Series, Session, Track } from "@/lib/iracing-types";

/** Maps from series/get: series_id -> series_name and series_id -> category_id (1=oval, 2=road, 3=dirt oval, 4=dirt road). */
async function fetchSeriesMaps(token: string): Promise<{
  namesById: Map<number, string>;
  categoryById: Map<number, number>;
}> {
  const result = await iracingDataGet<unknown>("series/get", { token });
  const namesById = new Map<number, string>();
  const categoryById = new Map<number, number>();
  if (!result.ok) return { namesById, categoryById };
  const raw = result.data;
  const arr = Array.isArray(raw) ? raw : (raw && typeof raw === "object" && "data" in (raw as object)) ? (raw as { data: unknown[] }).data : [];
  for (const item of arr as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;
    const id = (item.series_id ?? item.seriesId) as number | undefined;
    if (id == null) continue;
    const numId = Number(id);
    const name = (item.series_name ?? item.seriesName ?? item.series_short_name) as string | undefined;
    if (name && typeof name === "string") namesById.set(numId, name);
    const cat = (item.category_id ?? item.categoryId) as number | string | undefined;
    const numCat = typeof cat === "number" ? cat : Number(cat);
    if (!Number.isNaN(numCat) && numCat >= 1 && numCat <= 4) categoryById.set(numId, numCat);
  }
  return { namesById, categoryById };
}

const CATEGORY_IDS: CategoryId[] = [1, 2, 3, 4];

/** iRacing Season 1 = Dec–Mar, 2 = Mar–Jun, 3 = Jun–Sep, 4 = Sep–Dec. Returns { year, quarter } for "now". */
function getCurrentSeasonYearQuarter(): { season_year: number; season_quarter: number } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1; // 1–12
  // Approximate: Q1 ends ~early Mar, Q2 ~early Jun, Q3 ~early Sep, Q4 ~early Dec
  if (m <= 3) return { season_year: y, season_quarter: 1 };
  if (m <= 6) return { season_year: y, season_quarter: 2 };
  if (m <= 9) return { season_year: y, season_quarter: 3 };
  return { season_year: y, season_quarter: 4 };
}

/** API response shape (camelCase from members-ng). Pass through any track fields the API returns. */
type ApiScheduleItem = {
  track?: {
    track_id?: number;
    trackId?: number;
    track_name?: string;
    trackName?: string;
    config_name?: string | null;
    configName?: string | null;
    length_miles?: number;
    lengthMiles?: number;
    track_length?: number;
    turn_count?: number;
    turnCount?: number;
    corners?: number;
    lap_count?: number;
    lapCount?: number;
  };
  race_week_num?: number;
  raceWeekNum?: number;
  race_time_descriptors?: { session_minutes?: number }[];
  raceTimeDescriptors?: { sessionMinutes?: number }[];
};

type ApiSeasonItem = {
  season_id?: number;
  seasonId?: number;
  season_year?: number;
  seasonYear?: number;
  season_quarter?: number;
  seasonQuarter?: number;
  series_id?: number;
  seriesId?: number;
  series_name?: string;
  seriesName?: string;
  category_id?: number;
  categoryId?: number;
  /** Current race week for this series (iRacing API) */
  race_week?: number;
  raceWeek?: number;
  schedules?: ApiScheduleItem[];
};

function normTrack(tr: ApiScheduleItem["track"]): Track {
  if (!tr) return { track_id: 0, track_name: "Unknown", config_name: null };
  const t = tr as Record<string, unknown>;
  const lengthMiles =
    typeof t.length_miles === "number" ? t.length_miles
    : typeof t.lengthMiles === "number" ? t.lengthMiles
    : typeof t.track_length === "number" ? t.track_length
    : undefined;
  const turnCount =
    typeof t.turn_count === "number" ? t.turn_count
    : typeof t.turnCount === "number" ? t.turnCount
    : typeof t.corners === "number" ? t.corners
    : undefined;
  const lapCount = typeof t.lap_count === "number" ? t.lap_count : typeof t.lapCount === "number" ? t.lapCount : undefined;
  return {
    track_id: tr.track_id ?? tr.trackId ?? 0,
    track_name: tr.track_name ?? tr.trackName ?? "Unknown",
    config_name: tr.config_name ?? tr.configName ?? null,
    ...(lengthMiles != null && { length_miles: lengthMiles }),
    ...(turnCount != null && { turn_count: turnCount }),
    ...(lapCount != null && { lap_count: lapCount }),
  };
}

function normSession(item: ApiScheduleItem): Session {
  const track = normTrack(item.track);
  const raceWeekNum = item.race_week_num ?? item.raceWeekNum ?? 0;
  const descriptors = item.race_time_descriptors ?? item.raceTimeDescriptors ?? [];
  const first = descriptors[0] as { session_minutes?: number; sessionMinutes?: number } | undefined;
  const sessionMinutes = first?.session_minutes ?? first?.sessionMinutes;
  return {
    race_week_num: raceWeekNum,
    track,
    duration_minutes: sessionMinutes,
  };
}

function normCategoryId(n: number | string | undefined): CategoryId {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isNaN(num) && CATEGORY_IDS.includes(num as CategoryId)) return num as CategoryId;
  return 2; // default road
}

function toSeasonItems(data: unknown): ApiSeasonItem[] {
  if (Array.isArray(data)) return data as ApiSeasonItem[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["seasons", "data", "series"]) {
      const arr = o[key];
      if (Array.isArray(arr) && arr.length > 0) {
        const first = arr[0] as Record<string, unknown>;
        if (first && (first.series_id != null || first.seriesId != null || first.series_name != null || first.seriesName != null)) {
          return arr as ApiSeasonItem[];
        }
      }
    }
  }
  return [];
}

/**
 * Fetch current season schedule using the given access token.
 * Tries current season_year and season_quarter first; if that returns no items,
 * retries without params (API "current" behavior) so we still get data.
 * Returns a Season suitable for getRecommendations, or null on error.
 * Deduplicated per request so layout and pages see the same schedule.
 */
export const fetchCurrentSeasonSchedule = cache(async function fetchCurrentSeasonSchedule(token: string): Promise<Season | null> {
  const { season_year, season_quarter } = getCurrentSeasonYearQuarter();
  let result = await iracingDataGet<unknown>("series/seasons", {
    token,
    searchParams: {
      season_year: String(season_year),
      season_quarter: String(season_quarter),
    },
  });
  if (!result.ok) return null;

  let items = toSeasonItems(result.data);
  if (items.length === 0) {
    result = await iracingDataGet<unknown>("series/seasons", { token });
    if (!result.ok) return null;
    items = toSeasonItems(result.data);
  }
  if (items.length === 0) return null;

  // series/seasons often omits series_name and category_id; resolve both from series/get
  const { namesById: seriesNamesById, categoryById: seriesCategoryById } = await fetchSeriesMaps(token);

  const first = items[0];
  const seasonId = first.season_id ?? first.seasonId ?? 0;
  const seasonYear = first.season_year ?? first.seasonYear ?? season_year;
  const seasonQuarter = first.season_quarter ?? first.seasonQuarter ?? season_quarter;

  const seriesKey = (sid: number, sId: number) => `${sId}-${sid}`;
  const seriesMap = new Map<string, Series>();
  for (const item of items) {
    const seriesId = item.series_id ?? item.seriesId ?? 0;
    const itemSeasonId = item.season_id ?? item.seasonId ?? 0;
    const key = seriesKey(seriesId, itemSeasonId);
    const seriesName =
      (item.series_name ?? item.seriesName ?? seriesNamesById.get(seriesId)) ?? "Unknown";
    const categoryId = normCategoryId(
      item.category_id ?? item.categoryId ?? seriesCategoryById.get(seriesId)
    );
    const currentRaceWeek = item.race_week ?? item.raceWeek;
    const rawSchedules = item.schedules ?? [];
    const sessions: Session[] = rawSchedules.map(normSession);

    seriesMap.set(key, {
      series_id: seriesId,
      series_name: seriesName,
      category_id: categoryId,
      ...(currentRaceWeek != null && { current_race_week: currentRaceWeek }),
      sessions,
    });
  }

  return {
    season_id: seasonId,
    season_year: seasonYear,
    season_quarter: seasonQuarter,
    series: Array.from(seriesMap.values()),
  };
});
