import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, IRACING_OAUTH } from "@/lib/iracing-oauth";

/**
 * iRacing OAuth callback: exchange code for tokens, set cookies, redirect to dashboard.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard?error=oauth_not_configured", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = request.cookies.get(IRACING_OAUTH.VERIFIER_COOKIE)?.value;
  const savedState = request.cookies.get(IRACING_OAUTH.STATE_COOKIE)?.value;

  const redirectUri = process.env.IRACING_REDIRECT_URI ?? `${url.origin}/api/auth/iracing/callback`;
  const dashboardUrl = new URL("/dashboard", url.origin);

  if (!code || !verifier || !state || state !== savedState) {
    dashboardUrl.searchParams.set("error", "oauth_callback_invalid");
    const res = NextResponse.redirect(dashboardUrl);
    clearOAuthCookies(res);
    return res;
  }

  try {
    const data = await exchangeCode({
      clientId,
      clientSecret,
      redirectUri,
      code,
      codeVerifier: verifier,
    });
    const expiresAt = String(Math.floor(Date.now() / 1000) + (data.expires_in ?? 600));
    const opts = { ...IRACING_OAUTH.COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 };
    const res = NextResponse.redirect(dashboardUrl);
    clearOAuthCookies(res); // clear verifier/state
    res.cookies.set(IRACING_OAUTH.ACCESS_TOKEN_COOKIE, data.access_token, opts);
    res.cookies.set(IRACING_OAUTH.EXPIRES_AT_COOKIE, expiresAt, opts);
    if (data.refresh_token) {
      res.cookies.set(IRACING_OAUTH.REFRESH_TOKEN_COOKIE, data.refresh_token, opts);
    }
    return res;
  } catch (err) {
    dashboardUrl.searchParams.set("error", "oauth_token_exchange_failed");
    const res = NextResponse.redirect(dashboardUrl);
    clearOAuthCookies(res);
    return res;
  }
}

function clearOAuthCookies(res: NextResponse) {
  const tenYearsAgo = new Date(0);
  res.cookies.set(IRACING_OAUTH.VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(IRACING_OAUTH.STATE_COOKIE, "", { path: "/", maxAge: 0 });
}
