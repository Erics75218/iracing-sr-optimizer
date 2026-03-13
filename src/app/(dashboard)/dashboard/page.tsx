import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getIracingId } from "@/lib/auth";
import { getAccessToken } from "@/lib/iracing-oauth";
import { iracingDataGet } from "@/lib/iracing-api";
import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";
import { fetchIracingTracks } from "@/lib/fetch-tracks";
import { getEffectiveTrackIndex, getScheduleTracksMissingData } from "@/lib/missing-tracks";
import { MOCK_SEASON } from "@/lib/mock-schedule";
import { getRecommendations } from "@/lib/recommendations";
import { getMergedTrackIndex, getTrackLayout } from "@/data/track-layouts";
import type { IracingTrackIndexEntry } from "@/data/iracing-track-index";
import { getDisciplineSortIndex } from "@/lib/discipline-order";
import { RecommendationsList } from "@/components/recommendations-list";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<{ error?: string }> };

function buildOAuthCallbackUrl(hostHeader: string | null, protoHeader: string | null): string {
  const host = hostHeader ?? "localhost:3000";
  const proto = protoHeader ?? "http";
  const parts = host.split(":");
  const port = parts[1] ?? (proto === "https" ? "443" : "3000");
  const hostname = parts[0];
  const baseHost = hostname === "localhost" ? "127.0.0.1" : hostname;
  return `${proto}://${baseHost}:${port}/api/auth/iracing/callback`;
}

export default async function DashboardPage({ searchParams }: Props) {
  const iracingId = await getIracingId();
  const cookieStore = await cookies();
  const h = await headers();
  const oauthCallbackUrl = buildOAuthCallbackUrl(h.get("host"), h.get("x-forwarded-proto"));
  const accessToken = getAccessToken(cookieStore);
  const apiTest = accessToken
    ? await iracingDataGet("constants/divisions", { token: accessToken })
    : { ok: false as const, status: 401, error: "Not connected" };
  const params = await searchParams;
  const oauthNotConfigured = params.error === "oauth_not_configured";
  const oauthExchangeFailed = params.error === "oauth_token_exchange_failed";
  const oauthCallbackInvalid = params.error === "oauth_callback_invalid";
  const oauthUnauthorizedClient = params.error === "oauth_unauthorized_client";
  const productionRedirectNotApproved = params.error === "production_redirect_not_approved";
  const hasOauthError = Boolean(params.error);

  // When connected, fetch live schedule + API track list; merge and add placeholders for any still-missing so we have no gaps
  const hasLiveData = apiTest.ok;
  let recommendations: Awaited<ReturnType<typeof getRecommendations>>;
  let isMockRecommendations = false;
  let currentSeason: Awaited<ReturnType<typeof fetchCurrentSeasonSchedule>> = null;
  let trackIndexEntries: IracingTrackIndexEntry[] | undefined;

  if (hasLiveData && accessToken) {
    const [season, tracksResult] = await Promise.all([
      fetchCurrentSeasonSchedule(accessToken),
      fetchIracingTracks(accessToken),
    ]);
    currentSeason = season;
    const merged =
      tracksResult.ok && tracksResult.entries.length > 0
        ? getMergedTrackIndex(tracksResult.entries)
        : getMergedTrackIndex([]);
    trackIndexEntries = getEffectiveTrackIndex(currentSeason ?? null, merged);

    recommendations = currentSeason
      ? getRecommendations(currentSeason, {
          limit: 10,
          getTrackLayout: (id, config, name) => getTrackLayout(id, config, name, trackIndexEntries),
        })
      : getRecommendations(MOCK_SEASON, { limit: 5 });
    isMockRecommendations = !currentSeason;
  } else {
    recommendations = getRecommendations(MOCK_SEASON, { limit: 5 });
    isMockRecommendations = recommendations.length > 0;
  }

  const missingTracks = getScheduleTracksMissingData(currentSeason ?? null, trackIndexEntries);

  const isWeek13 =
    (currentSeason?.series?.some((s) => s.current_race_week === 12) ?? false);

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const orderA = getDisciplineSortIndex(a.categoryId, a.seriesName);
    const orderB = getDisciplineSortIndex(b.categoryId, b.seriesName);
    if (orderA !== orderB) return orderA - orderB;
    return (b.potentialCorners ?? b.score) - (a.potentialCorners ?? a.score);
  });

  return (
    <div className="space-y-6">
      {hasOauthError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            iRacing connection error
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {oauthUnauthorizedClient &&
              "iRacing rejected the request because this app’s callback URL is not in your iRacing OAuth client’s Redirect URIs. Add the exact URL below in iRacing (OAuth client → Redirect URIs), then try Connect again."}
            {oauthExchangeFailed &&
              "Token exchange failed. iRacing rejected the code exchange (e.g. wrong secret or redirect_uri)."}
            {oauthCallbackInvalid &&
              "The return from iRacing sign-in could not be verified. Use the same URL you use in the address bar (including the port, e.g. 3001) for the whole flow, then click Connect to iRacing again."}
            {productionRedirectNotApproved &&
              "Connect on this site is disabled until iRacing approves the production callback URL. Ask iRacing to add: https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback — then set IRACING_PRODUCTION_URI_APPROVED=true in Vercel and redeploy."}
            {oauthNotConfigured && "OAuth env vars are not set on the server."}
            {params.error && !oauthUnauthorizedClient && !oauthExchangeFailed && !oauthCallbackInvalid && !productionRedirectNotApproved && !oauthNotConfigured && (
              <>Error code: <code className="text-xs">{params.error}</code></>
            )}
          </p>
          {oauthUnauthorizedClient && (
            <p className="mt-2 text-xs font-mono break-all text-foreground bg-muted/80 rounded px-2 py-1.5">
              {oauthCallbackUrl}
            </p>
          )}
          {hasOauthError && (
            <p className="mt-2 text-xs text-muted-foreground">
              URL error param: <code>{params.error}</code>
            </p>
          )}
        </div>
      )}
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {isWeek13 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            It’s Week 13 in iRacing
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            Weekly schedules are in flux during Week 13. Do not assume series and track lineups are correct until the new season starts.
          </p>
        </div>
      )}
      {iracingId ? (
        <p className="text-muted-foreground">
          Schedule and recommendations for iRacing ID{" "}
          <span className="font-medium text-foreground">{iracingId}</span>
          {!isMockRecommendations && recommendations.length > 0
            ? " — use the sidebar to open Formula, Sports Car, Oval, or other disciplines."
            : "."}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">
            Enter your iRacing ID to get race recommendations for your Safety
            Rating.
          </p>
          <Button asChild>
            <Link href="/login">Enter iRacing ID</Link>
          </Button>
        </>
      )}
      {missingTracks.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <h2 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Track data missing for {missingTracks.length} schedule track{missingTracks.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These tracks appear in the current season but have no turn/length data yet. Use the exact names below when adding them to the track index.
          </p>
          <ul className="mt-2 max-h-48 overflow-y-auto rounded border bg-background/80 p-2 font-mono text-xs">
            {missingTracks.map((t) => (
              <li key={`${t.track_id}-${t.track_name}-${t.config_name ?? ""}`} className="py-0.5">
                <span className="text-foreground">{t.track_name}</span>
                {t.config_name ? (
                  <span className="text-muted-foreground"> — {t.config_name}</span>
                ) : null}
                {t.track_id ? (
                  <span className="ml-1 text-muted-foreground">(id: {t.track_id})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className={`rounded-lg border p-4 ${hasLiveData && !isMockRecommendations ? "bg-green-50 dark:bg-green-950/30" : "bg-card"}`}
      >
        <h2 className="text-sm font-medium">SR-friendly recommendations</h2>
        {isMockRecommendations && (
          <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">
            Using fallback data — connect to iRacing for live schedule.
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Races ranked by length and lap count to help maximize Safety Rating.
          {hasLiveData && !isMockRecommendations && recommendations.length > 0 && (
            <> · <span className="text-foreground/80">Live schedule</span></>
          )}
        </p>
        <div className="mt-3">
          <RecommendationsList
            recommendations={sortedRecommendations}
            isMock={isMockRecommendations}
          />
        </div>
      </section>
    </div>
  );
}
