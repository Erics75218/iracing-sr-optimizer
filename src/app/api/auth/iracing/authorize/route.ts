import { NextRequest, NextResponse } from "next/server";
import { IRACING_ID_COOKIE } from "@/lib/auth";
import { generatePkce, buildAuthorizeUrl, createStateWithVerifier, IRACING_OAUTH } from "@/lib/iracing-oauth";

/**
 * Start iRacing OAuth: redirect user to iRacing to log in. Callback will store tokens and send user to dashboard.
 * State includes the PKCE verifier (signed) so the callback works even when cookies are not sent (e.g. localhost vs 127.0.0.1).
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
  const isProduction = url.hostname === "iracing-sr-optimizer.vercel.app";
  const productionApproved = process.env.IRACING_PRODUCTION_URI_APPROVED === "true";
  if (isProduction && !productionApproved) {
    const dashboardUrl = new URL("/dashboard", url.origin);
    dashboardUrl.searchParams.set("error", "production_redirect_not_approved");
    return NextResponse.redirect(dashboardUrl);
  }

  // Use fixed redirect URI so iRacing (which has one URL registered) accepts it. Open the app at that same URL (e.g. http://127.0.0.1:3000).
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const redirectUri = isLocal
    ? (process.env.IRACING_REDIRECT_URI ?? "http://127.0.0.1:3000/api/auth/iracing/callback")
    : (process.env.IRACING_REDIRECT_URI ?? `${url.origin}/api/auth/iracing/callback`);
  const { verifier, challenge } = generatePkce();
  const existingIracingId = request.cookies.get(IRACING_ID_COOKIE)?.value?.trim() ?? null;
  const state = createStateWithVerifier(verifier, clientSecret, existingIracingId);

  const authUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: challenge,
    state,
  });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(IRACING_OAUTH.VERIFIER_COOKIE, verifier, {
    ...IRACING_OAUTH.COOKIE_OPTIONS,
    maxAge: 60 * 10, // 10 min, fallback if callback has cookies
  });
  res.cookies.set(IRACING_OAUTH.STATE_COOKIE, state, {
    ...IRACING_OAUTH.COOKIE_OPTIONS,
    maxAge: 60 * 10,
  });
  return res;
}
