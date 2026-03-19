/**
 * Debug: returns schedule fetch stats (no tokens or raw data).
 * GET /api/debug/schedule — requires being logged in (cookie).
 * Compare response on Vercel vs local to see if series/sessions differ.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/iracing-oauth";
import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const tokenResult = await getValidAccessToken(cookieStore);
  const token = tokenResult.token;
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

    const out = NextResponse.json({
      ok: true,
      seriesCount: series.length,
      seriesWithSessions,
      totalSessions,
      seasonYear: season.season_year,
      seasonQuarter: season.season_quarter,
    });

    if (tokenResult.setCookies) {
      for (const c of tokenResult.setCookies) {
        out.cookies.set(c.name, c.value, c.options as any);
      }
    }

    return out;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, seriesCount: 0, seriesWithSessions: 0, totalSessions: 0 },
      { status: 500 }
    );
  }
}
