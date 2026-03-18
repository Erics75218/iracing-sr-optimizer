/**
 * Fetch current season schedule from iRacing Data API and map to our Season type.
 * Uses series/seasons; series names are resolved via series/get when missing (API often omits series_name in seasons payload).
 * Cached per-request (React cache) and across requests (Next unstable_cache, 2 min) so layout and section pages see the same schedule.
 */

import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { iracingDataGet } from "@/lib/iracing-api";
import type { CategoryId, Season, Series, Session, Track } from "@/lib/iracing-types";

const SERIES_CATEGORY_NAMES = ["formula_car", "sports_car", "oval", "dirt_oval", "dirt_road", "road"] as const;
type SeriesCategoryString = (typeof SERIES_CATEGORY_NAMES)[number];

/** Maps from series/get: series_id -> series_name, category_id, and category (string). */
async function fetchSeriesMaps(token: string): Promise<{
  namesById: Map<number, string>;
  categoryById: Map<number, number>;
  categoryNameById: Map<number, SeriesCategoryString>;
}> {
  const result = await iracingDataGet<unknown>("series/get", { token });
  const namesById = new Map<number, string>();
  const categoryById = new Map<number, number>();
  const categoryNameById = new Map<number, SeriesCategoryString>();
  if (!result.ok) return { namesById, categoryById, categoryNameById };
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
    const catName = (item.category ?? item.categoryName) as string | undefined;
    if (catName && typeof catName === "string") {
      const normalized = catName.toLowerCase().replace(/-/g, "_") as string;
      if (SERIES_CATEGORY_NAMES.includes(normalized as SeriesCategoryString))
        categoryNameById.set(numId, normalized as SeriesCategoryString);
    }
  }
  return { namesById, categoryById, categoryNameById };
}

const CATEGORY_IDS: CategoryId[] = [1, 2, 3, 4];

/** iRacing Season 1 = Dec–Mar, 2 = Mar–Jun, 3 = Jun–Sep, 4 = Sep–Dec. Best-effort fallback only. */
export function getCurrentSeasonYearQuarterFallback(): { season_year: number; season_quarter: number } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1; // 1–12
  // Approximate: Q1 ends ~early Mar, Q2 ~early Jun, Q3 ~early Sep, Q4 ~early Dec
  if (m <= 3) return { season_year: y, season_quarter: 1 };
  if (m <= 6) return { season_year: y, season_quarter: 2 };
  if (m <= 9) return { season_year: y, season_quarter: 3 };
  return { season_year: y, season_quarter: 4 };
}

type LookupCurrentSeasonItem = {
  tag?: string;
  lookups?: Array<{
    lookup_type?: string;
    lookup_values?: Array<{ description?: string; seq?: number; value?: string }>;
  }>;
};

function extractCurrentSeasonFromLookup(raw: unknown): { season_year: number; season_quarter: number } | null {
  if (!Array.isArray(raw)) return null;
  // Look for lookup values that contain season_year and season_quarter.
  // The API shape is a generic lookup list; we parse values when possible.
  let year: number | null = null;
  let quarter: number | null = null;
  for (const item of raw as LookupCurrentSeasonItem[]) {
    for (const lookup of item.lookups ?? []) {
      for (const v of lookup.lookup_values ?? []) {
        const desc = (v.description ?? "").toLowerCase();
        const val = v.value;
        if (!val) continue;
        if (desc.includes("season year") || desc === "season_year") {
          const n = parseInt(val, 10);
          if (!Number.isNaN(n)) year = n;
        }
        if (desc.includes("season quarter") || desc.includes("season") && desc.includes("quarter") || desc === "season_quarter") {
          const n = parseInt(val, 10);
          if (!Number.isNaN(n)) quarter = n;
        }
      }
    }
  }
  if (year != null && quarter != null && quarter >= 1 && quarter <= 4) return { season_year: year, season_quarter: quarter };
  return null;
}

async function getCurrentSeasonYearQuarter(token: string): Promise<{ season_year: number; season_quarter: number }> {
  const res = await iracingDataGet<unknown>("lookup/current_season", { token });
  if (res.ok) {
    const parsed = extractCurrentSeasonFromLookup(res.data);
    if (parsed) return parsed;
  }
  return getCurrentSeasonYearQuarterFallback();
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
  race_week?: number;
  raceWeek?: number;
  schedules?: ApiScheduleItem[];
  schedule?: ApiScheduleItem[];
  raceSchedule?: ApiScheduleItem[];
  race_schedule?: ApiScheduleItem[];
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
    for (const key of ["seasons", "data", "series", "schedule", "season_list"]) {
      const val = o[key];
      if (Array.isArray(val) && val.length > 0) {
        const first = val[0] as Record<string, unknown>;
        if (first && (first.series_id != null || first.seriesId != null || first.series_name != null || first.seriesName != null)) {
          return val as ApiSeasonItem[];
        }
      }
    }
    // Some APIs return { data: { 2025: [...], 1: [...] } }; flatten first array-like value
    for (const v of Object.values(o)) {
      if (Array.isArray(v) && v.length > 0) {
        const first = v[0] as Record<string, unknown>;
        if (first && (first.series_id != null || first.seriesId != null)) {
          return v as ApiSeasonItem[];
        }
      }
    }
  }
  return [];
}

/** For debug: how many season items we can parse from API response (same logic as toSeasonItems). */
export function getSeasonItemsCount(data: unknown): number {
  return toSeasonItems(data).length;
}

/** series/season_list item: season_id + series_id for current quarter. */
type SeasonListItem = {
  season_id?: number;
  seasonId?: number;
  series_id?: number;
  seriesId?: number;
  season_year?: number;
  seasonYear?: number;
  season_quarter?: number;
  seasonQuarter?: number;
};

/** series/season_schedule schedule item: one week per series. */
type ApiSeasonScheduleItem = {
  series_id?: number;
  seriesId?: number;
  series_name?: string;
  seriesName?: string;
  race_week_num?: number;
  raceWeekNum?: number;
  track?: ApiScheduleItem["track"];
  race_time_descriptors?: { session_minutes?: number }[];
  raceTimeDescriptors?: { sessionMinutes?: number }[];
};

/** Fetch series/season_list for current year/quarter; returns (season_id, series_id) for each. */
async function fetchSeasonList(
  token: string,
  season_year: number,
  season_quarter: number
): Promise<{ season_id: number; series_id: number }[]> {
  const res = await iracingDataGet<{ seasons?: SeasonListItem[] }>("series/season_list", {
    token,
    searchParams: {
      season_year: String(season_year),
      season_quarter: String(season_quarter),
    },
  });
  if (!res.ok) return [];
  const seasons = res.data?.seasons;
  if (!Array.isArray(seasons)) return [];
  const out: { season_id: number; series_id: number }[] = [];
  for (const item of seasons) {
    const sid = item.season_id ?? item.seasonId;
    const srid = item.series_id ?? item.seriesId;
    if (sid != null && srid != null) out.push({ season_id: sid, series_id: srid });
  }
  return out;
}

/** Fetch series/season_schedule by season_id; returns raw schedules array. */
async function fetchSeasonSchedule(
  token: string,
  season_id: number
): Promise<ApiSeasonScheduleItem[]> {
  const res = await iracingDataGet<{ schedules?: ApiSeasonScheduleItem[]; success?: boolean }>(
    "series/season_schedule",
    { token, searchParams: { season_id: String(season_id) } }
  );
  if (!res.ok) return [];
  const data = res.data;
  if (!data?.schedules || !data?.success) return [];
  return data.schedules;
}

function normSessionFromSeasonScheduleItem(item: ApiSeasonScheduleItem): Session {
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

/** Inner implementation: one API fetch. Used by cached wrapper. */
async function fetchCurrentSeasonScheduleInner(token: string): Promise<Season | null> {
  const { season_year, season_quarter } = await getCurrentSeasonYearQuarter(token);
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

  const { namesById: seriesNamesById, categoryById: seriesCategoryById, categoryNameById: seriesCategoryNameById } = await fetchSeriesMaps(token);

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
    const categoryName = seriesCategoryNameById.get(seriesId);
    const currentRaceWeek = item.race_week ?? item.raceWeek;
    const rawSchedules =
      item.schedules ??
      item.schedule ??
      item.raceSchedule ??
      item.race_schedule ??
      [];
    const sessions: Session[] = Array.isArray(rawSchedules) ? rawSchedules.map(normSession) : [];
    // Ensure schedules are displayed in Week 01 → Week 13 order regardless of API ordering.
    sessions.sort((a, b) => a.race_week_num - b.race_week_num);

    seriesMap.set(key, {
      series_id: seriesId,
      series_name: seriesName,
      category_id: categoryId,
      ...(categoryName != null && { category_name: categoryName }),
      ...(currentRaceWeek != null && { current_race_week: currentRaceWeek }),
      sessions,
    });
  }

  // Backfill series missing from series/seasons (e.g. Formula F4 Regional Asia Pacific #540)
  // using series/season_list + series/season_schedule for the same year/quarter.
  const existingSeriesIds = new Set(Array.from(seriesMap.values()).map((s) => s.series_id));
  const seasonList = await fetchSeasonList(token, seasonYear, seasonQuarter);
  const seriesIdToSeasonId = new Map<number, number>();
  for (const row of seasonList) {
    seriesIdToSeasonId.set(row.series_id, row.season_id);
  }
  const categoriesToBackfill: SeriesCategoryString[] = ["formula_car", "sports_car", "oval", "dirt_oval", "dirt_road", "road"];
  for (const [sid, catName] of seriesCategoryNameById) {
    if (!categoriesToBackfill.includes(catName) || existingSeriesIds.has(sid)) continue;
    const backfillSeasonId = seriesIdToSeasonId.get(sid);
    if (backfillSeasonId == null) continue;
    const scheduleItems = await fetchSeasonSchedule(token, backfillSeasonId);
    const forSeries = scheduleItems.filter(
      (i) => (i.series_id ?? i.seriesId) === sid
    );
    if (forSeries.length === 0) continue;
    const sessions: Session[] = forSeries.map(normSessionFromSeasonScheduleItem);
    sessions.sort((a, b) => a.race_week_num - b.race_week_num);
    const seriesName = seriesNamesById.get(sid) ?? forSeries[0]?.series_name ?? forSeries[0]?.seriesName ?? "Unknown";
    const categoryId = normCategoryId(seriesCategoryById.get(sid));
    const key = seriesKey(sid, backfillSeasonId);
    seriesMap.set(key, {
      series_id: sid,
      series_name: seriesName,
      category_id: categoryId,
      ...(catName != null && { category_name: catName }),
      sessions,
    });
    existingSeriesIds.add(sid);
  }

  return {
    season_id: seasonId,
    season_year: seasonYear,
    season_quarter: seasonQuarter,
    series: Array.from(seriesMap.values()),
  };
}

/**
 * Fetch current season schedule. Cached per-request and across requests (2 min, keyed by token hash).
 * Returns a Season suitable for getRecommendations, or null on error.
 */
export const fetchCurrentSeasonSchedule = cache(async function fetchCurrentSeasonSchedule(token: string): Promise<Season | null> {
  const key = createHash("sha256").update(token).digest("hex").slice(0, 16);
  return unstable_cache(
    () => fetchCurrentSeasonScheduleInner(token),
    ["current-season-schedule", key],
    { revalidate: 120 }
  )();
});
