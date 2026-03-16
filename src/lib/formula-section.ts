/**
 * Formula tab: filter series by iRacing category when available, else by name pattern.
 * iRacing series/get returns category string (formula_car, sports_car, oval, etc.); we use that first.
 */

import type { Season, Series } from "./iracing-types";

export { findSeriesByName, getSeriesCurrentWeekSession } from "./discipline-schedule";

/** Category id: 2 = road (Formula and Sports Car are both road). */
const ROAD_CATEGORY = 2;

/**
 * Match Formula / open-wheel series by name when API category is missing or "road".
 * "Skip Barber" only when not "Skip Barber Mustang" (Mustang Challenge is sports car).
 */
export const FORMULA_PATTERN =
  /Formula|F3|F4|IR-04|iR-04|Dallara|USF 2000|PM-18|Ray FF|FR500|Skip Barber(?! Mustang)|Formula 1600|FF1600|F1600|FIA F4|Super Formula|Spec Racer|Pro 2 Lite|Indy NXT|INDYCAR|Vee|13th Week (Super Formula|FF1600|FIA F4|Indy NXT|Formula Fun|Formula A|INDYCAR)/i;

export function getFormulaSeries(season: Season | null): Series[] {
  if (!season?.series?.length) return [];
  return season.series.filter((s) => {
    if (s.category_id !== ROAD_CATEGORY) return false;
    if (s.category_name === "formula_car") return true;
    if (s.category_name === "sports_car") return false;
    return FORMULA_PATTERN.test(s.series_name);
  });
}
