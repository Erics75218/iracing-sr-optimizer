/**
 * Order of the 5 racing types in the app (sidebar and dashboard list).
 * Used to sort recommendations by discipline: Formula, Sports Car, Oval, Dirt Oval, Dirt Road.
 */

import type { CategoryId } from "./iracing-types";

/** Sort order 0–4 for the five disciplines. Lower = first. */
export const DISCIPLINE_ORDER = [
  "Formula",
  "Sports Car",
  "Oval",
  "Dirt Oval",
  "Dirt Road",
] as const;

export type DisciplineKey = (typeof DISCIPLINE_ORDER)[number];

/**
 * Returns sort index 0–4 by category_id and API category_name (series_id–driven).
 * formula_car = 0, sports_car = 1, oval = 2, dirt_oval = 3, dirt_road = 4.
 */
export function getDisciplineSortIndex(categoryId: CategoryId, categoryName?: string): number {
  if (categoryId === 2) {
    return categoryName === "formula_car" ? 0 : 1;
  }
  if (categoryId === 1) return 2;
  if (categoryId === 3) return 3;
  if (categoryId === 4) return 4;
  return 5; // unknown last
}
