/**
 * Debug: call iRacing API directly and return RAW schedule for Formula F4 Regional Asia Pacific.
 * No app logic — just series/season_schedule?season_id=6133 and filter to series_id=540.
 *
 * GET /api/debug/f4-asia-raw
 * Token from: (1) cookie after "Connect to iRacing" on dashboard, or (2) ?token=YOUR_ACCESS_TOKEN (local only).
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/iracing-oauth";
import { iracingDataGet } from "@/lib/iracing-api";

export const dynamic = "force-dynamic";

const SERIES_ID_F4_ASIA = 540;
const SEASON_ID_F4_ASIA = 6133;

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const tokenResult = await getValidAccessToken(cookieStore);
  let token = tokenResult.token;
  if (!token) {
    const url = new URL(req.url);
    const qToken = url.searchParams.get("token")?.trim();
    if (qToken) token = qToken;
  }
  if (!token) {
    return NextResponse.json(
      {
        error: "Not connected",
        hint: "Either connect in the app (Dashboard → Connect to iRacing), then open this URL again in the same browser; or call with ?token=YOUR_ACCESS_TOKEN (get token after connecting, e.g. from Application → Cookies → iracing_access_token).",
      },
      { status: 401 }
    );
  }

  try {
    const res = await iracingDataGet<{
      success?: boolean;
      season_id?: number;
      schedules?: Array<{
        series_id?: number;
        seriesId?: number;
        series_name?: string;
        seriesName?: string;
        race_week_num?: number;
        raceWeekNum?: number;
        track?: { track_id?: number; track_name?: string; trackName?: string; config_name?: string; configName?: string };
        [key: string]: unknown;
      }>;
    }>("series/season_schedule", {
      token,
      searchParams: { season_id: String(SEASON_ID_F4_ASIA) },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.error, status: res.status },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    const data = res.data;
    const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
    const forF4Asia = schedules.filter(
      (s) => (s.series_id ?? s.seriesId) === SERIES_ID_F4_ASIA
    );
    const byWeek = forF4Asia
      .slice()
      .sort(
        (a, b) =>
          (a.race_week_num ?? a.raceWeekNum ?? 0) -
          (b.race_week_num ?? b.raceWeekNum ?? 0)
      );

    const out = NextResponse.json({
      message: "Raw iRacing API response for season_schedule(6133), filtered to series_id 540",
      apiSeasonId: data?.season_id ?? SEASON_ID_F4_ASIA,
      apiSuccess: data?.success ?? null,
      totalScheduleItemsInSeason: schedules.length,
      itemsForSeries540: forF4Asia.length,
      scheduleForF4AsiaByWeek: byWeek.map((s) => ({
        race_week_num: s.race_week_num ?? s.raceWeekNum,
        track_id: s.track?.track_id,
        track_name: s.track?.track_name ?? s.track?.trackName,
        config_name: s.track?.config_name ?? s.track?.configName ?? null,
      })),
      rawFullResponse: data,
    });

    if ("setCookies" in tokenResult && tokenResult.setCookies) {
      for (const c of tokenResult.setCookies) {
        out.cookies.set(c.name, c.value, c.options as any);
      }
    }

    return out;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
