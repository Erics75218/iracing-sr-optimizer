/**
 * Debug: returns schedule fetch stats (no tokens or raw data).
 * GET /api/debug/schedule — requires being logged in (cookie).
 * Compare response on Vercel vs local to see if series/sessions differ.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccessToken } from "@/lib/iracing-oauth";
import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = getAccessToken(cookieStore);
  if (!token) {
    return NextResponse.json(
      { error: "Not connected", hint: "Connect to iRacing first, then hit this URL again." },
      { status: 401 }
    );
  }

  try {
    const season = await fetchCurrentSeasonSchedule(token);
    if (!season) {
      return NextResponse.json({
        ok: false,
        message: "Schedule fetch returned null",
        seriesCount: 0,
        seriesWithSessions: 0,
        totalSessions: 0,
      });
    }

    const series = season.series ?? [];
    let seriesWithSessions = 0;
    let totalSessions = 0;
    for (const s of series) {
      const n = s.sessions?.length ?? 0;
      if (n > 0) seriesWithSessions++;
      totalSessions += n;
    }

    return NextResponse.json({
      ok: true,
      seriesCount: series.length,
      seriesWithSessions,
      totalSessions,
      seasonYear: season.season_year,
      seasonQuarter: season.season_quarter,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, seriesCount: 0, seriesWithSessions: 0, totalSessions: 0 },
      { status: 500 }
    );
  }
}
