/**
 * Step-by-step schedule fetch diagnostic (no cache). Use to see where Vercel fails.
 * GET /api/debug/schedule-steps — requires being connected (cookie).
 * Call from browser while logged in + connected: https://YOUR_APP.vercel.app/api/debug/schedule-steps
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/iracing-oauth";
import { iracingDataGet } from "@/lib/iracing-api";
import { getCurrentSeasonYearQuarterFallback, getSeasonItemsCount } from "@/lib/fetch-schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const tokenResult = await getValidAccessToken(cookieStore);
  const token = tokenResult.token;
  if (!token) {
    return NextResponse.json(
      { error: "Not connected", hint: "Connect to iRacing first, then open this URL in the same browser." },
      { status: 401 }
    );
  }

  // Debug endpoint keeps using the fallback heuristic; schedule fetching uses lookup/current_season.
  const { season_year, season_quarter } = getCurrentSeasonYearQuarterFallback();
  const out: {
    hasToken: boolean;
    season_year: number;
    season_quarter: number;
    step1_seasons_with_params: { ok: boolean; itemsCount: number; dataKeys?: string[]; error?: string };
    step2_seasons_no_params?: { ok: boolean; itemsCount: number; dataKeys?: string[]; error?: string };
    step3_series_get: { ok: boolean; error?: string };
    theory?: string;
  } = {
    hasToken: true,
    season_year,
    season_quarter,
    step1_seasons_with_params: { ok: false, itemsCount: 0 },
    step3_series_get: { ok: false },
  };

  // Step 1: series/seasons with season_year and season_quarter
  try {
    const r1 = await iracingDataGet<unknown>("series/seasons", {
      token,
      searchParams: {
        season_year: String(season_year),
        season_quarter: String(season_quarter),
      },
    });
    out.step1_seasons_with_params.ok = r1.ok;
    if (r1.ok) {
      out.step1_seasons_with_params.itemsCount = getSeasonItemsCount(r1.data);
      if (r1.data && typeof r1.data === "object" && !Array.isArray(r1.data)) {
        out.step1_seasons_with_params.dataKeys = Object.keys(r1.data as object);
      }
    } else {
      out.step1_seasons_with_params.error = r1.error;
    }
  } catch (e) {
    out.step1_seasons_with_params.error = e instanceof Error ? e.message : String(e);
  }

  // Step 2: if step1 got 0 items, retry without params (same as fetch-schedule)
  if (out.step1_seasons_with_params.itemsCount === 0) {
    try {
      const r2 = await iracingDataGet<unknown>("series/seasons", { token });
      out.step2_seasons_no_params = { ok: r2.ok, itemsCount: 0 };
      if (r2.ok) {
        out.step2_seasons_no_params.itemsCount = getSeasonItemsCount(r2.data);
        if (r2.data && typeof r2.data === "object" && !Array.isArray(r2.data)) {
          out.step2_seasons_no_params.dataKeys = Object.keys(r2.data as object);
        }
      } else {
        out.step2_seasons_no_params.error = r2.error;
      }
    } catch (e) {
      out.step2_seasons_no_params = {
        ok: false,
        itemsCount: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // Step 3: series/get (for series names)
  try {
    const r3 = await iracingDataGet<unknown>("series/get", { token });
    out.step3_series_get.ok = r3.ok;
    if (!r3.ok) out.step3_series_get.error = r3.error;
  } catch (e) {
    out.step3_series_get.error = e instanceof Error ? e.message : String(e);
  }

  // Suggest theory from results
  if (!out.step1_seasons_with_params.ok && out.step1_seasons_with_params.error) {
    if (out.step1_seasons_with_params.error.includes("timeout") || out.step1_seasons_with_params.error.includes("15")) {
      out.theory = "Timeout (15s): cold start or slow API from Vercel region; try longer timeout or retry.";
    } else if (out.step1_seasons_with_params.error.includes("401") || out.step1_seasons_with_params.error.includes("403")) {
      out.theory = "Auth: token rejected by iRacing; check cookie is sent and token valid.";
    } else {
      out.theory = "Network or API error; see step1 error.";
    }
  } else if (out.step1_seasons_with_params.ok && out.step1_seasons_with_params.itemsCount === 0) {
    out.theory = "API returned ok but payload shape not recognized (dataKeys show what we got). Add parsing for that shape or check iRacing API change.";
  } else if (out.step1_seasons_with_params.ok && out.step1_seasons_with_params.itemsCount > 0) {
    out.theory = "Schedule fetch should work; if UI still empty, check cache (unstable_cache) or layout vs page token.";
  }

  const resp = NextResponse.json(out);
  if (tokenResult.setCookies) {
    for (const c of tokenResult.setCookies) {
      resp.cookies.set(c.name, c.value, c.options as any);
    }
  }
  return resp;
}
