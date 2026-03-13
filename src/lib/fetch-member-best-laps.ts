/**
 * Fetch member's best laps by car and track for a license category.
 * iRacing Data API: we try member/career_best_laps or similar; fallback to empty.
 */

import { iracingDataGet } from "@/lib/iracing-api";

export type BestLapRow = {
  track_name: string;
  car_name: string;
  best_lap_ms: number | null;
  subsession_id?: number;
};

/** License key to optional category/series filter for API. */
const LICENSE_TO_CATEGORY: Record<string, number> = {
  formula: 2,
  sportsCar: 2,
  oval: 1,
  dirtOval: 3,
  dirtRoad: 4,
};

/**
 * Try to fetch best laps for the member. Returns empty array if endpoint missing or fails.
 */
export async function fetchMemberBestLaps(
  _custId: string,
  _token: string,
  _licenseKey: string
): Promise<BestLapRow[]> {
  // iRacing data API may expose member best laps via member/career_best_laps or
  // we need to aggregate from results + lap data. For now return empty so the
  // table renders with a "no data" state; we can add the real API when we have
  // the exact endpoint and shape.
  const categoryId = LICENSE_TO_CATEGORY[_licenseKey];
  if (categoryId == null) return [];

  try {
    // Try member/career_best_laps if it exists (some wrappers document it).
    // If the endpoint does not exist (404) or returns another shape, we return [].
    const result = await iracingDataGet<unknown>("member/career_best_laps", {
      token: _token,
      searchParams: { cust_id: _custId, category_id: String(categoryId) },
    });
    if (!result.ok) return []; // 404 or other error
    const data = result.data;
    if (!data || typeof data !== "object") return [];
    const arr = Array.isArray(data) ? data : (data as { data?: unknown[] }).data;
    if (!Array.isArray(arr) || arr.length === 0) return [];

    const rows: BestLapRow[] = [];
    for (const item of arr as Record<string, unknown>[]) {
      const track = (item.track_name ?? item.trackName ?? item.track_name_short) as string | undefined;
      const car = (item.car_name ?? item.carName ?? item.car_short_name) as string | undefined;
      const lap = (item.best_lap_ms ?? item.best_lap_time ?? item.best_lap) as number | undefined;
      if (track && car) {
        rows.push({
          track_name: String(track),
          car_name: String(car),
          best_lap_ms: typeof lap === "number" && lap > 0 ? lap : null,
          subsession_id: (item.subsession_id ?? item.subsessionId) as number | undefined,
        });
      }
    }
    return rows;
  } catch {
    return [];
  }
}
