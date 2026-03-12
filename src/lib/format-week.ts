/**
 * iRacing uses 0-based race_week_num in the API (first week = 0, second = 1, …).
 * We display weeks as 01–13: add 1 and pad so 0→"01", 1→"02", … 12→"13".
 */

/** Convert API week (0-based) to display week (01–13). */
export function formatDisplayWeek(raceWeekNum: number): string {
  const display = raceWeekNum + 1;
  return String(display).padStart(2, "0");
}
