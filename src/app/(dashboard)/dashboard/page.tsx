import Link from "next/link";
import { cookies } from "next/headers";
import { getIracingId } from "@/lib/auth";
import { getAccessToken } from "@/lib/iracing-oauth";
import { iracingDataGet } from "@/lib/iracing-api";
import { MOCK_SEASON } from "@/lib/mock-schedule";
import { getRecommendations } from "@/lib/recommendations";
import { RecommendationsList } from "@/components/recommendations-list";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const iracingId = await getIracingId();
  const cookieStore = await cookies();
  const accessToken = getAccessToken(cookieStore);
  const apiTest = accessToken
    ? await iracingDataGet("constants/divisions", { token: accessToken })
    : { ok: false as const, status: 401, error: "Not connected" };
  const params = await searchParams;
  const oauthNotConfigured = params.error === "oauth_not_configured";

  // Use mock recommendations until we have live API data; same UI will show real data later
  const hasLiveData = apiTest.ok;
  const recommendations = hasLiveData
    ? [] // TODO: fetch season/schedule from API and call getRecommendations(season)
    : getRecommendations(MOCK_SEASON, { limit: 5 });
  const isMockRecommendations = !hasLiveData && recommendations.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {iracingId ? (
        <p className="text-muted-foreground">
          Schedule and recommendations for iRacing ID{" "}
          <span className="font-medium text-foreground">{iracingId}</span> will
          appear here once we have season data.
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

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">iRacing API</h2>
        {apiTest.ok ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Connected. You can use schedule and member data.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/api/auth/iracing/disconnect">Disconnect</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-1 space-y-2">
            {oauthNotConfigured ? (
              <p className="text-sm text-muted-foreground">
                iRacing OAuth isn’t set up yet. After iRacing approves your
                client, add <code className="text-xs">IRACING_CLIENT_ID</code>{" "}
                and <code className="text-xs">IRACING_CLIENT_SECRET</code> in
                Vercel → Settings → Environment Variables, then redeploy.
              </p>
            ) : (
              <>
                <p className="text-sm text-destructive">
                  {apiTest.error}
                  {apiTest.status ? ` (Status: ${apiTest.status})` : ""}
                </p>
                <Button asChild size="sm">
                  <Link href="/api/auth/iracing/authorize">Connect to iRacing</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">SR-friendly recommendations</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Races ranked by length and lap count to help maximize Safety Rating.
        </p>
        <div className="mt-3">
          <RecommendationsList
            recommendations={recommendations}
            isMock={isMockRecommendations}
          />
        </div>
      </section>
    </div>
  );
}
