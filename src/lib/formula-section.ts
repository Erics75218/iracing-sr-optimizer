/**
 * Formula tab: filter series by Formula pattern.
 * Formula series are road (category_id 2) open-wheel; we filter by name and category so other types don't appear.
 */

import type { Season, Series } from "./iracing-types";

export { findSeriesByName, getSeriesCurrentWeekSession } from "./discipline-schedule";

/** Category id: 2 = road (all iRacing Formula series are road). */
const ROAD_CATEGORY = 2;

/**
 * Match iRacing Formula / open-wheel series only.
 * "13th Week" is restricted to formula-style names so we don't match 13th Week GT4, Late Model, etc.
 */
export const FORMULA_PATTERN =
  /Formula|F3|F4|IR-04|iR-04|Dallara|USF 2000|PM-18|Ray FF|FR500|Skip Barber|Formula 1600|FF1600|F1600|FIA F4|Super Formula|Spec Racer|Pro 2 Lite|Indy NXT|INDYCAR|Vee|13th Week (Super Formula|FF1600|FIA F4|Indy NXT|Formula Fun|Formula A|INDYCAR)/i;

export function getFormulaSeries(season: Season | null): Series[] {
  if (!season?.series?.length) return [];
  return season.series.filter(
    (s) => s.category_id === ROAD_CATEGORY && FORMULA_PATTERN.test(s.series_name)
  );
}
