import { NextRequest, NextResponse } from "next/server";
import { IRACING_ID_COOKIE } from "@/lib/auth";
import { generatePkce, buildAuthorizeUrl, createStateWithVerifier, IRACING_OAUTH } from "@/lib/iracing-oauth";
import { randomBytes } from "node:crypto";

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

  const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  // Important:
  // You may not have access to iRacing OAuth client settings to register localhost redirect URIs.
  // For local development, we therefore intentionally use the production redirect URI (which should
  // already be whitelisted) and then "import" the token back into localhost via a local-only endpoint.
  const productionCallback =
    process.env.IRACING_PRODUCTION_REDIRECT_URI?.trim() ||
    "https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback";

  const redirectUri =
    isLocalHost
      ? productionCallback
      : (process.env.IRACING_REDIRECT_URI?.trim() || `${url.origin}/api/auth/iracing/callback`);

  const returnOrigin = url.origin;
  const importNonce = isLocalHost ? randomBytes(16).toString("hex") : null;
  const { verifier, challenge } = generatePkce();
  const existingIracingId = request.cookies.get(IRACING_ID_COOKIE)?.value?.trim() ?? null;
  const state = createStateWithVerifier(
    verifier,
    clientSecret,
    existingIracingId,
    // When local, callback redirects back to this local origin to import tokens.
    isLocalHost ? returnOrigin : null,
    importNonce
  );

  const authUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: challenge,
    state,
  });

  const secure = url.protocol === "https:";
  const res = NextResponse.redirect(authUrl);
  res.cookies.set(IRACING_OAUTH.VERIFIER_COOKIE, verifier, {
    ...IRACING_OAUTH.COOKIE_OPTIONS,
    maxAge: 60 * 10, // 10 min, fallback if callback has cookies
    secure,
  });
  res.cookies.set(IRACING_OAUTH.STATE_COOKIE, state, {
    ...IRACING_OAUTH.COOKIE_OPTIONS,
    maxAge: 60 * 10,
    secure,
  });

  if (importNonce) {
    res.cookies.set(IRACING_OAUTH.IMPORT_NONCE_COOKIE, importNonce, {
      ...IRACING_OAUTH.COOKIE_OPTIONS,
      maxAge: 60 * 10,
      secure,
    });
  }
  return res;
}
