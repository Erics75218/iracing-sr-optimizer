/**
 * Order of the 5 racing types in the app (sidebar and dashboard list).
 * Used to sort recommendations by discipline: Formula, Sports Car, Oval, Dirt Oval, Dirt Road.
 */

import type { CategoryId } from "./iracing-types";
import { FORMULA_PATTERN } from "./formula-section";

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
 * Returns sort index 0–4 for a recommendation by category and series name.
 * Formula (road + formula pattern) = 0, Sports Car (road, not formula) = 1,
 * Oval = 2, Dirt Oval = 3, Dirt Road = 4.
 */
export function getDisciplineSortIndex(categoryId: CategoryId, seriesName: string): number {
  if (categoryId === 2) {
    return FORMULA_PATTERN.test(seriesName) ? 0 : 1;
  }
  if (categoryId === 1) return 2;
  if (categoryId === 3) return 3;
  if (categoryId === 4) return 4;
  return 5; // unknown last
}
