/**
 * Get unique series names per discipline from the current season schedule.
 * Used to show expandable sub-menus in the sidebar. Series are grouped by type:
 * Formula & Sports Car = road (2) + name pattern; Oval/Dirt Oval/Dirt Road = category only.
 * Falls back to series/get when schedule is empty so sidebar still shows series.
 */

import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";
import { FORMULA_PATTERN, getFormulaSeries } from "@/lib/formula-section";
import { getSportsCarSeries } from "@/lib/discipline-schedule";
import { iracingDataGet } from "@/lib/iracing-api";
import type { CategoryId, Series, SeriesCategoryName } from "@/lib/iracing-types";

const SPORTS_CAR_PATTERN =
  /GT|Porsche|Mazda|BMW|McLaren|Lamborghini|Ferrari|Touring|Sports Car|Production Car|Radical|Audi|Mercedes|Lexus|Cadillac|IMSA|WSC|LMP|GT3|GT4|Mustang|13th Week (GT|Mazda|BMW|Porsche|Ferrari|Toyota|MX-5|GR86|M2)/i;

const CATEGORY_NAMES = ["formula_car", "sports_car", "oval", "dirt_oval", "dirt_road", "road"] as const;

function uniqueSorted(names: string[]): string[] {
  return [...new Set(names)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function isFormulaSeries(s: Series): boolean {
  if (s.category_id !== 2) return false;
  if (s.category_name === "formula_car") return true;
  if (s.category_name === "sports_car") return false;
  return FORMULA_PATTERN.test(s.series_name);
}

function isSportsCarSeries(s: Series): boolean {
  if (s.category_id !== 2) return false;
  if (s.category_name === "sports_car") return true;
  if (s.category_name === "formula_car") return false;
  return SPORTS_CAR_PATTERN.test(s.series_name);
}

function seriesNamesForCategory(series: Series[], categoryId: CategoryId): string[] {
  const names: string[] = [];
  for (const s of series) {
    if (s.category_id === categoryId) names.push(s.series_name);
  }
  return uniqueSorted(names);
}

/** category_id: 1=oval, 2=road, 3=dirt oval, 4=dirt road */
export type DisciplineSeriesNames = {
  formula: string[];
  sportsCar: string[];
  oval: string[];
  dirtOval: string[];
  dirtRoad: string[];
};

function buildFromSeries(series: Series[]): DisciplineSeriesNames {
  return {
    formula: uniqueSorted(series.filter(isFormulaSeries).map((s) => s.series_name)),
    sportsCar: uniqueSorted(series.filter(isSportsCarSeries).map((s) => s.series_name)),
    oval: seriesNamesForCategory(series, 1),
    dirtOval: seriesNamesForCategory(series, 3),
    dirtRoad: seriesNamesForCategory(series, 4),
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
      formula: uniqueSorted(getFormulaSeries(season).map((s) => s.series_name)),
      sportsCar: uniqueSorted(getSportsCarSeries(season).map((s) => s.series_name)),
      oval: seriesNamesForCategory(series, 1),
      dirtOval: seriesNamesForCategory(series, 3),
      dirtRoad: seriesNamesForCategory(series, 4),
    };
  }
  const fallbackSeries = await getSeriesFromApi(accessToken);
  if (!fallbackSeries?.length) return null;
  return buildFromSeries(fallbackSeries);
}
