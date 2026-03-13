/**
 * Fetch member's best laps by car and track using iRacing Data API.
 * 1) Prefer stats/member_bests (cust_id → cars_driven; then per car_id → bests with track + best_lap_time).
 * 2) Fallback: stats/member_recent_races + results/lap_data — get recent races, then lap data per
 *    subsession, aggregate best lap per (car, track), resolve car names from car/get.
 * See OpenAPI: stats/member_bests, stats/member_recent_races, results/lap_data.
 */

import { iracingDataGet } from "@/lib/iracing-api";

export type BestLapRow = {
  track_name: string;
  car_name: string;
  best_lap_ms: number | null;
  subsession_id?: number;
};

const LICENSE_TO_CATEGORY: Record<string, number> = {
  formula: 2,
  sportsCar: 2,
  oval: 1,
  dirtOval: 3,
  dirtRoad: 4,
};

type MemberBestsResponse = {
  cust_id?: number;
  car_id?: number;
  cars_driven?: Array<{ car_id: number; car_name: string }>;
  bests?: Array<{
    best_lap_time?: number | null;
    event_type?: string;
    track?: { track_name?: string; track_id?: number; config_name?: string | null };
  }>;
};

/** iRacing API uses ten-thousandths of a second for lap/best_lap_time. 905000 = 90.5s => 90500 ms. */
function bestLapTimeToMs(raw: number | null | undefined): number | null {
  if (raw == null || typeof raw !== "number" || raw <= 0) return null;
  const ms = raw / 10;
  return Number.isFinite(ms) ? ms : null;
}

function toBestsData(obj: unknown): MemberBestsResponse | null {
  if (!obj || typeof obj !== "object") return null;
  return obj as MemberBestsResponse;
}

/** Try stats/member_bests first (official endpoint). */
async function fetchViaMemberBests(
  custId: string,
  token: string
): Promise<BestLapRow[]> {
  const first = await iracingDataGet<unknown>("stats/member_bests", {
    token,
    searchParams: { cust_id: custId },
  });
  if (!first.ok) return [];
  const data = toBestsData(first.data);
  if (!data?.cars_driven?.length) return [];

  const cars = data.cars_driven;
  const rows: BestLapRow[] = [];

  if (data.bests?.length && data.car_id != null) {
    const carName = cars.find((c) => c.car_id === data.car_id)?.car_name ?? String(data.car_id);
    for (const b of data.bests) {
      const trackName = (b.track?.track_name ?? b.track?.config_name ?? "Unknown") as string;
      rows.push({ track_name: trackName, car_name: carName, best_lap_ms: bestLapTimeToMs(b.best_lap_time) });
    }
    if (rows.length > 0) return sortRows(rows);
  }

  for (const car of cars) {
    const res = await iracingDataGet<unknown>("stats/member_bests", {
      token,
      searchParams: { cust_id: custId, car_id: String(car.car_id) },
    });
    if (!res.ok) continue;
    const carData = toBestsData(res.data);
    const bests = carData?.bests;
    if (!Array.isArray(bests)) continue;
    for (const b of bests) {
      const trackName = (b.track?.track_name ?? b.track?.config_name ?? "Unknown") as string;
      rows.push({
        track_name: trackName,
        car_name: car.car_name,
        best_lap_ms: bestLapTimeToMs(b.best_lap_time),
      });
    }
  }
  return sortRows(rows);
}

function sortRows(rows: BestLapRow[]): BestLapRow[] {
  return [...rows].sort((a, b) => {
    const t = a.track_name.localeCompare(b.track_name);
    if (t !== 0) return t;
    return a.car_name.localeCompare(b.car_name);
  });
}

type RecentRaceItem = {
  subsession_id?: number;
  car_id?: number;
  track?: { track_id?: number; track_name?: string };
  car_name?: string;
};

type MemberRecentRacesResponse = {
  cust_id?: number;
  races?: RecentRaceItem[];
};

type LapDataItem = { lap_time?: number | null; lap_number?: number };

const MAX_RACES_FOR_LAP_FALLBACK = 40;

/** Fallback: member_recent_races → lap_data per subsession → best per (car, track); car names from car/get. */
async function fetchViaResultsAndLapData(
  custId: string,
  token: string
): Promise<BestLapRow[]> {
  const recent = await iracingDataGet<unknown>("stats/member_recent_races", {
    token,
    searchParams: { cust_id: custId },
  });
  if (!recent.ok) return [];
  const raw = recent.data as MemberRecentRacesResponse | undefined;
  const races = raw?.races ?? [];
  if (races.length === 0) return [];

  const bestByKey = new Map<string, { ms: number; trackName: string; carId: number }>();
  const subsessionsToFetch = new Map<
    number,
    { car_id: number; car_name: string; track_id: number; track_name: string }
  >();

  for (const r of races.slice(0, MAX_RACES_FOR_LAP_FALLBACK)) {
    const subId = r.subsession_id;
    const carId = r.car_id;
    const track = r.track;
    if (subId == null || carId == null || !track?.track_name) continue;
    const trackName = track.track_name;
    const trackId = track.track_id ?? 0;
    const carName = r.car_name ?? `Car ${carId}`;
    subsessionsToFetch.set(subId, {
      car_id: carId,
      car_name: carName,
      track_id: trackId,
      track_name: trackName,
    });
  }

  const carIds = new Set(subsessionsToFetch.values().map((v) => v.car_id));
  const carNames = await fetchCarNames(token, Array.from(carIds));

  for (const [subId, info] of subsessionsToFetch) {
    const lapRes = await iracingDataGet<unknown>("results/lap_data", {
      token,
      searchParams: {
        subsession_id: String(subId),
        simsession_number: "0",
        cust_id: custId,
      },
    });
    if (!lapRes.ok) continue;
    const lapList = toLapArray(lapRes.data);
    let bestMs: number | null = null;
    for (const lap of lapList) {
      const t = lap.lap_time;
      if (t != null && typeof t === "number" && t > 0) {
        const ms = bestLapTimeToMs(t);
        if (ms != null && (bestMs == null || ms < bestMs)) bestMs = ms;
      }
    }
    if (bestMs == null) continue;
    const key = `${info.car_id}:${info.track_id}:${info.track_name}`;
    const existing = bestByKey.get(key);
    if (!existing || bestMs < existing.ms)
      bestByKey.set(key, {
        ms: bestMs,
        trackName: info.track_name,
        carId: info.car_id,
      });
  }

  const rows: BestLapRow[] = [];
  for (const { ms, trackName, carId } of bestByKey.values()) {
    rows.push({
      track_name: trackName,
      car_name: carNames.get(carId) ?? `Car ${carId}`,
      best_lap_ms: ms,
    });
  }
  return sortRows(rows);
}

function toLapArray(data: unknown): LapDataItem[] {
  if (Array.isArray(data)) return data as LapDataItem[];
  if (data && typeof data === "object" && "data" in (data as object))
    return ((data as { data: unknown }).data as LapDataItem[]) ?? [];
  return [];
}

async function fetchCarNames(
  token: string,
  carIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (carIds.length === 0) return map;
  const res = await iracingDataGet<Array<{ car_id?: number; car_name?: string }>>(
    "car/get",
    { token }
  );
  if (!res.ok || !Array.isArray(res.data)) return map;
  const idSet = new Set(carIds);
  for (const c of res.data) {
    if (c.car_id != null && idSet.has(c.car_id) && c.car_name)
      map.set(c.car_id, c.car_name);
  }
  return map;
}

/**
 * Fetch best laps for the member. Uses stats/member_bests; if empty, falls back to
 * stats/member_recent_races + results/lap_data to build best laps by car/track.
 */
export async function fetchMemberBestLaps(
  custId: string,
  token: string,
  licenseKey: string
): Promise<BestLapRow[]> {
  const _categoryId = LICENSE_TO_CATEGORY[licenseKey];

  try {
    const fromBests = await fetchViaMemberBests(custId, token);
    if (fromBests.length > 0) return fromBests;
    return await fetchViaResultsAndLapData(custId, token);
  } catch {
    return [];
  }
}
