/**
 * Fetch all iRacing tracks and configs from the API (GET /data/track/get).
 * This endpoint requires authentication; it returns the full list of tracks
 * and their configurations so we can have complete coverage instead of
 * relying only on the static index.
 */

import { iracingDataGet, type IracingApiError } from "./iracing-api";
import type { IracingTrackIndexEntry } from "@/data/iracing-track-index";

/** Raw track from API (field names may be camelCase or snake_case). */
type ApiTrack = {
  track_id?: number;
  trackId?: number;
  track_name?: string;
  track_name_short?: string;
  track_name_long?: string;
  config_name?: string;
  track_config_name?: string;
  track_length?: number;
  track_length_km?: number;
  length_km?: number;
  length_miles?: number;
  turn_count?: number;
  corner_count?: number;
  num_corners?: number;
  configs?: Array<{
    config_name?: string;
    track_config_name?: string;
    track_length?: number;
    track_length_km?: number;
    length_km?: number;
    length_miles?: number;
    turn_count?: number;
    corner_count?: number;
    num_corners?: number;
  }>;
};

const KM_TO_MILES = 0.621371;

function toMiles(v: number | undefined, isKm = false): number | undefined {
  if (v == null || typeof v !== "number" || v <= 0) return undefined;
  return isKm ? v * KM_TO_MILES : v;
}

function toTurnCount(t: ApiTrack | { turn_count?: number; corner_count?: number; num_corners?: number }): number | undefined {
  const n = t.turn_count ?? t.corner_count ?? t.num_corners;
  return typeof n === "number" && n >= 0 ? n : undefined;
}

function normalizeTrack(t: ApiTrack): IracingTrackIndexEntry[] {
  const trackId = t.track_id ?? t.trackId;
  const trackName = t.track_name ?? (t as Record<string, string>).trackName ?? t.track_name_long ?? t.track_name_short ?? "";
  const entries: IracingTrackIndexEntry[] = [];

  if (Array.isArray(t.configs) && t.configs.length > 0) {
    for (const c of t.configs) {
      const configName = (c.config_name ?? c.track_config_name ?? "") as string;
      const lengthKm = c.track_length_km ?? c.length_km ?? (typeof c.track_length === "number" && c.track_length > 10 ? c.track_length : undefined);
      const lengthMiles = c.length_miles ?? toMiles(lengthKm, true) ?? (typeof c.track_length === "number" && c.track_length < 20 ? c.track_length : undefined);
      const turns = toTurnCount(c);
      if (lengthMiles != null && lengthMiles > 0 && turns != null) {
        entries.push({
          ...(trackId != null && { track_id: trackId }),
          ...(trackName && { track_name: String(trackName).trim() }),
          config_name: String(configName).trim(),
          turn_count: turns,
          length_miles: lengthMiles,
        });
      }
    }
  } else {
    const lengthKm = t.track_length_km ?? t.length_km ?? (typeof t.track_length === "number" && t.track_length > 10 ? t.track_length : undefined);
    const lengthMiles = t.length_miles ?? toMiles(lengthKm, true) ?? (typeof t.track_length === "number" && t.track_length < 20 ? t.track_length : undefined);
    const turns = toTurnCount(t);
    const configName = (t.config_name ?? t.track_config_name ?? "") as string;
    if (lengthMiles != null && lengthMiles > 0 && turns != null) {
      entries.push({
        ...(trackId != null && { track_id: trackId }),
        ...(trackName && { track_name: String(trackName).trim() }),
        config_name: String(configName).trim(),
        turn_count: turns,
        length_miles: lengthMiles,
      });
    }
  }

  return entries;
}

/**
 * Fetch all tracks and configs from iRacing API. Requires a valid auth token.
 * Returns normalized entries compatible with IRACING_TRACK_INDEX; merge or
 * use these first, then fall back to the static index for any missing rows.
 */
export async function fetchIracingTracks(
  token: string
): Promise<{ ok: true; entries: IracingTrackIndexEntry[] } | IracingApiError> {
  const result = await iracingDataGet<ApiTrack[]>("track/get", { token });
  if (!result.ok) return result;
  const raw = Array.isArray(result.data) ? result.data : [];
  const entries: IracingTrackIndexEntry[] = [];
  for (const t of raw) {
    const normalized = normalizeTrack(t);
    entries.push(...normalized);
  }
  return { ok: true, entries };
}
