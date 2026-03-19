/**
 * Get unique series names per discipline from the current season schedule.
 * Used to show expandable sub-menus in the sidebar. Series are grouped by type:
 * Formula & Sports Car = road (2) + name pattern; Oval/Dirt Oval/Dirt Road = category only.
 * Falls back to series/get when schedule is empty so sidebar still shows series.
 */

import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";
import { getFormulaSeries } from "@/lib/formula-section";
import { getSportsCarSeries } from "@/lib/discipline-schedule";
import { iracingDataGet } from "@/lib/iracing-api";
import type { CategoryId, Series, SeriesCategoryName } from "@/lib/iracing-types";

const CATEGORY_NAMES = ["formula_car", "sports_car", "oval", "dirt_oval", "dirt_road", "road"] as const;

export type DisciplineSeriesItem = { series_id: number; series_name: string };

function uniqueSortedSeries(items: DisciplineSeriesItem[]): DisciplineSeriesItem[] {
  const byId = new Map<number, DisciplineSeriesItem>();
  for (const it of items) byId.set(it.series_id, it);
  return [...byId.values()].sort((a, b) => a.series_name.localeCompare(b.series_name));
}

/** Formula = road (2) with API category_name "formula_car" only (series_id–driven). */
function isFormulaSeries(s: Series): boolean {
  return s.category_id === 2 && s.category_name === "formula_car";
}

/** Sports Car = road (2) with API category_name "sports_car" only (series_id–driven). */
function isSportsCarSeries(s: Series): boolean {
  return s.category_id === 2 && s.category_name === "sports_car";
}

function seriesItemsForCategory(series: Series[], categoryId: CategoryId): DisciplineSeriesItem[] {
  const items: DisciplineSeriesItem[] = [];
  for (const s of series) {
    if (s.category_id === categoryId) items.push({ series_id: s.series_id, series_name: s.series_name });
  }
  return uniqueSortedSeries(items);
}

/** category_id: 1=oval, 2=road, 3=dirt oval, 4=dirt road */
export type DisciplineSeriesNames = {
  formula: DisciplineSeriesItem[];
  sportsCar: DisciplineSeriesItem[];
  oval: DisciplineSeriesItem[];
  dirtOval: DisciplineSeriesItem[];
  dirtRoad: DisciplineSeriesItem[];
};

function buildFromSeries(series: Series[]): DisciplineSeriesNames {
  return {
    formula: uniqueSortedSeries(series.filter(isFormulaSeries).map((s) => ({ series_id: s.series_id, series_name: s.series_name }))),
    sportsCar: uniqueSortedSeries(series.filter(isSportsCarSeries).map((s) => ({ series_id: s.series_id, series_name: s.series_name }))),
    oval: seriesItemsForCategory(series, 1),
    dirtOval: seriesItemsForCategory(series, 3),
    dirtRoad: seriesItemsForCategory(series, 4),
  };
}

/** Fetch series list from series/get and build discipline names (fallback when schedule is empty). */
async function getSeriesFromApi(token: string): Promise<Series[] | null> {
  const result = await iracingDataGet<unknown>("series/get", { token });
  if (!result.ok || !result.data) return null;
  const raw = result.data;
  const arr = Array.isArray(raw) ? raw : (raw && typeof raw === "object" && "data" in (raw as object)) ? (raw as { data: unknown[] }).data : [];
  const series: Series[] = [];
  for (const item of arr as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;
    const seriesId = (item.series_id ?? item.seriesId) as number | undefined;
    if (seriesId == null) continue;
    const name = (item.series_name ?? item.seriesName ?? item.series_short_name) as string | undefined;
    const cat = (item.category_id ?? item.categoryId) as number | string | undefined;
    const numCat = typeof cat === "number" ? cat : Number(cat);
    const categoryId = !Number.isNaN(numCat) && numCat >= 1 && numCat <= 4 ? (numCat as CategoryId) : 2;
    const catName = (item.category ?? item.categoryName) as string | undefined;
    const categoryName: SeriesCategoryName | undefined =
      catName && typeof catName === "string"
        ? (catName.toLowerCase().replace(/-/g, "_") as SeriesCategoryName)
        : undefined;
    const validCategory =
      categoryName && (CATEGORY_NAMES as readonly string[]).includes(categoryName)
        ? (categoryName as SeriesCategoryName)
        : undefined;
    series.push({
      series_id: Number(seriesId),
      series_name: (name && typeof name === "string") ? name : "Unknown",
      category_id: categoryId,
      ...(validCategory && { category_name: validCategory }),
      sessions: [],
    });
  }
  return series.length ? series : null;
}

export async function getDisciplineSeriesNames(
  accessToken: string | null
): Promise<DisciplineSeriesNames | null> {
  if (!accessToken) return null;
  const season = await fetchCurrentSeasonSchedule(accessToken);
  if (season?.series?.length) {
    const series = season.series;
    return {
      formula: uniqueSortedSeries(getFormulaSeries(season).map((s) => ({ series_id: s.series_id, series_name: s.series_name }))),
      sportsCar: uniqueSortedSeries(getSportsCarSeries(season).map((s) => ({ series_id: s.series_id, series_name: s.series_name }))),
      oval: seriesItemsForCategory(series, 1),
      dirtOval: seriesItemsForCategory(series, 3),
      dirtRoad: seriesItemsForCategory(series, 4),
    };
  }
  const fallbackSeries = await getSeriesFromApi(accessToken);
  if (!fallbackSeries?.length) return null;
  return buildFromSeries(fallbackSeries);
}
