/**
 * Formula tab: filter series by iRacing API category (series_id → category_name).
 * Only series with category_name "formula_car" from series/get are shown as Formula.
 */

import type { Season, Series } from "./iracing-types";

export { findSeriesByName, findSeriesById, getSeriesCurrentWeekSession } from "./discipline-schedule";

/** Category id: 2 = road. Formula = road + category_name "formula_car" from API. */
const ROAD_CATEGORY = 2;

/** Formula series: road (2) with API category_name "formula_car" only (ID-based). */
export function getFormulaSeries(season: Season | null): Series[] {
  if (!season?.series?.length) return [];
  return season.series.filter(
    (s) => s.category_id === ROAD_CATEGORY && s.category_name === "formula_car"
  );
}
