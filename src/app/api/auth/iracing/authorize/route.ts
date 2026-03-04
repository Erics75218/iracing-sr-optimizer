import { NextRequest, NextResponse } from "next/server";
import { generatePkce, buildAuthorizeUrl, IRACING_OAUTH } from "@/lib/iracing-oauth";

/**
 * Start iRacing OAuth: redirect user to iRacing to log in. Callback will store tokens and send user to dashboard.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const url = new URL(request.url);
    const dashboardUrl = new URL("/dashboard", url.origin);
    dashboardUrl.searchParams.set("error", "oauth_not_configured");
    return NextResponse.redirect(dashboardUrl);
  }

  const url = new URL(request.url);
  const redirectUri = process.env.IRACING_REDIRECT_URI ?? `${url.origin}/api/auth/iracing/callback`;
  const { verifier, challenge } = generatePkce();
  const state = crypto.randomUUID();

  const authUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: challenge,
    state,
  });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(IRACING_OAUTH.VERIFIER_COOKIE, verifier, {
    ...IRACING_OAUTH.COOKIE_OPTIONS,
    maxAge: 60 * 10, // 10 min
  });
  res.cookies.set(IRACING_OAUTH.STATE_COOKIE, state, {
    ...IRACING_OAUTH.COOKIE_OPTIONS,
    maxAge: 60 * 10,
  });
  return res;
}
