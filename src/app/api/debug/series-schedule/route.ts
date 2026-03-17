/**
 * Debug: return the exact series schedule used by the app.
 * GET /api/debug/series-schedule?series_name=... OR ?series_id=...
 * Requires being logged in (cookie).
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccessToken } from "@/lib/iracing-oauth";
import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = getAccessToken(cookieStore);
  if (!token) {
    return NextResponse.json(
      { error: "Not connected", hint: "Connect to iRacing first, then hit this URL again." },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const seriesNameParam = url.searchParams.get("series_name")?.trim() ?? null;
  const seriesIdParam = url.searchParams.get("series_id")?.trim() ?? null;
  const seriesId = seriesIdParam ? parseInt(seriesIdParam, 10) : null;

  if (!seriesNameParam && (seriesId == null || Number.isNaN(seriesId))) {
    return NextResponse.json(
      {
        error: "Missing query param",
        expected: ["series_name", "series_id"],
        examples: [
          "/api/debug/series-schedule?series_name=Formula%20F4%20Regional%20Asia%20Pacific",
          "/api/debug/series-schedule?series_id=123",
        ],
      },
      { status: 400 }
    );
  }

  try {
    const season = await fetchCurrentSeasonSchedule(token);
    if (!season?.series?.length) {
      return NextResponse.json({ ok: false, error: "Schedule fetch returned no series" }, { status: 502 });
    }

    const match = season.series.find((s) => {
      if (seriesId != null && !Number.isNaN(seriesId)) return s.series_id === seriesId;
      if (seriesNameParam) return s.series_name === seriesNameParam;
      return false;
    });

    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          error: "Series not found in current season schedule",
          hint: "Double-check spelling or try series_id.",
          seasonYear: season.season_year,
          seasonQuarter: season.season_quarter,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      seasonYear: season.season_year,
      seasonQuarter: season.season_quarter,
      series: {
        series_id: match.series_id,
        series_name: match.series_name,
        category_id: match.category_id,
        category_name: match.category_name ?? null,
        current_race_week: match.current_race_week ?? null,
        sessions: (match.sessions ?? []).map((sess) => ({
          race_week_num: sess.race_week_num,
          track: sess.track,
          duration_minutes: sess.duration_minutes ?? null,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

