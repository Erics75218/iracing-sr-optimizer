/**
 * Get unique series names per discipline from the current season schedule.
 * Used to show expandable sub-menus in the sidebar. Series are grouped by type:
 * Formula & Sports Car = road (2) + name pattern; Oval/Dirt Oval/Dirt Road = category only.
 */

import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";
import { FORMULA_PATTERN, getFormulaSeries } from "@/lib/formula-section";
import type { CategoryId, Series } from "@/lib/iracing-types";

const SPORTS_CAR_PATTERN =
  /GT|Porsche|Mazda|BMW|McLaren|Lamborghini|Ferrari|Touring|Sports Car|Production Car|Radical|Audi|Mercedes|Lexus|Cadillac|IMSA|WSC|LMP|GT3|GT4|13th Week (GT|Mazda|BMW|Porsche|Ferrari|Toyota|MX-5|GR86|M2)/i;

function uniqueSorted(names: string[]): string[] {
  return [...new Set(names)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function seriesNamesForPattern(series: Series[], pattern: RegExp): string[] {
  const names: string[] = [];
  for (const s of series) {
    if (pattern.test(s.series_name)) names.push(s.series_name);
  }
  return uniqueSorted(names);
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

export async function getDisciplineSeriesNames(
  accessToken: string | null
): Promise<DisciplineSeriesNames | null> {
  if (!accessToken) return null;
  const season = await fetchCurrentSeasonSchedule(accessToken);
  if (!season?.series?.length) return null;

  const series = season.series;
  const roadSeries = series.filter((s) => s.category_id === 2);

  return {
    formula: uniqueSorted(getFormulaSeries(season).map((s) => s.series_name)),
    sportsCar: seriesNamesForPattern(roadSeries, SPORTS_CAR_PATTERN),
    oval: seriesNamesForCategory(series, 1),
    dirtOval: seriesNamesForCategory(series, 3),
    dirtRoad: seriesNamesForCategory(series, 4),
  };
}
