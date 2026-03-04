import Link from "next/link";
import { cookies } from "next/headers";
import { getIracingId } from "@/lib/auth";
import { getAccessToken } from "@/lib/iracing-oauth";
import { iracingDataGet } from "@/lib/iracing-api";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const iracingId = await getIracingId();
  const cookieStore = await cookies();
  const accessToken = getAccessToken(cookieStore);
  const apiTest = accessToken
    ? await iracingDataGet("constants/divisions", { token: accessToken })
    : { ok: false as const, status: 401, error: "Not connected" };

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
            <p className="text-sm text-destructive">
              {apiTest.error}
              {apiTest.status ? ` (Status: ${apiTest.status})` : ""}
            </p>
            <Button asChild size="sm">
              <Link href="/api/auth/iracing/authorize">Connect to iRacing</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
