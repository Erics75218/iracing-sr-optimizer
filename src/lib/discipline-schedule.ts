/**
 * Shared helpers for discipline pages: series by category, find by name, current week session.
 * Used by Formula, Sports Car, Oval, Dirt Oval, and Dirt Road pages for series list + this week's track.
 */

import type { CategoryId, Season, Series, Session } from "./iracing-types";

/** Get all series for a category (1=oval, 2=road, 3=dirt oval, 4=dirt road). */
export function getSeriesByCategory(
  season: Season | null,
  categoryId: CategoryId
): Series[] {
  if (!season?.series?.length) return [];
  return season.series.filter((s) => s.category_id === categoryId);
}

/** Find series by name (exact or contains match for sidebar selection). */
export function findSeriesByName(season: Season | null, name: string): Series | null {
  const q = name.trim();
  if (!q || !season?.series?.length) return null;
  for (const s of season.series) {
    if (s.series_name === q) return s;
    if (s.series_name.includes(q) || q.includes(s.series_name)) return s;
  }
  return null;
}

/** Get the session for the current race week, or the latest session if unknown. */
export function getSeriesCurrentWeekSession(series: Series): Session | null {
  const sessions = series.sessions ?? [];
  if (sessions.length === 0) return null;
  const week = series.current_race_week;
  if (week != null) {
    const found = sessions.find((s) => s.race_week_num === week);
    if (found) return found;
  }
  const maxWeek = Math.max(...sessions.map((s) => s.race_week_num));
  return sessions.find((s) => s.race_week_num === maxWeek) ?? sessions[sessions.length - 1] ?? null;
}

const SPORTS_CAR_PATTERN =
  /GT|Porsche|Mazda|BMW|McLaren|Lamborghini|Ferrari|Touring|Sports Car|Production Car|Radical|Audi|Mercedes|Lexus|Cadillac|IMSA|WSC|LMP|GT3|GT4|Mustang|13th Week (GT|Mazda|BMW|Porsche|Ferrari|Toyota|MX-5|GR86|M2)/i;

const ROAD_CATEGORY: CategoryId = 2;

/** Get Sports Car series: use API category_name when available, else name pattern. */
export function getSportsCarSeries(season: Season | null): Series[] {
  if (!season?.series?.length) return [];
  return season.series.filter((s) => {
    if (s.category_id !== ROAD_CATEGORY) return false;
    if (s.category_name === "sports_car") return true;
    if (s.category_name === "formula_car") return false;
    return SPORTS_CAR_PATTERN.test(s.series_name);
  });
}
