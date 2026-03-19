import { NextRequest, NextResponse } from "next/server";
import { IRACING_ID_COOKIE } from "@/lib/auth";
import { IRACING_OAUTH } from "@/lib/iracing-oauth";

/**
 * GET /api/debug/auth — Vercel auth diagnostics (no secrets).
 * Call from browser or: curl -i https://YOUR_APP.vercel.app/api/debug/auth
 * With cookie jar: curl -i -b cookies.txt -c cookies.txt https://YOUR_APP.vercel.app/api/debug/auth
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const productionCallback =
    process.env.IRACING_PRODUCTION_REDIRECT_URI?.trim() ||
    "https://iracing-sr-optimizer.vercel.app/api/auth/iracing/callback";

  const redirectUri = isLocalHost
    ? productionCallback
    : (process.env.IRACING_REDIRECT_URI?.trim() || `${url.origin}/api/auth/iracing/callback`);

  const isProduction = url.hostname === "iracing-sr-optimizer.vercel.app" || url.hostname.endsWith(".vercel.app");
  const productionApproved = process.env.IRACING_PRODUCTION_URI_APPROVED === "true";

  const hasId = Boolean(request.cookies.get(IRACING_ID_COOKIE)?.value?.trim());
  const hasAccess = Boolean(request.cookies.get(IRACING_OAUTH.ACCESS_TOKEN_COOKIE)?.value);
  const hasRefresh = Boolean(request.cookies.get(IRACING_OAUTH.REFRESH_TOKEN_COOKIE)?.value);
  const hasExpires = Boolean(request.cookies.get(IRACING_OAUTH.EXPIRES_AT_COOKIE)?.value);

  const oauthConfigured = Boolean(
    process.env.IRACING_CLIENT_ID?.trim() && process.env.IRACING_CLIENT_SECRET?.trim()
  );

  return NextResponse.json({
    host: url.host,
    origin: url.origin,
    protocol: url.protocol,
    redirect_uri_we_use: redirectUri,
    is_production_host: isProduction,
    production_redirect_approved: isProduction ? productionApproved : null,
    oauth_env_configured: oauthConfigured,
    cookies: {
      has_id_cookie: hasId,
      has_oauth_access: hasAccess,
      has_oauth_refresh: hasRefresh,
      has_oauth_expires: hasExpires,
      connected: hasAccess && hasExpires,
    },
    hints: [
      !oauthConfigured && "Set IRACING_CLIENT_ID and IRACING_CLIENT_SECRET in Vercel.",
      isProduction && !productionApproved && "Set IRACING_PRODUCTION_URI_APPROVED=true in Vercel.",
      isProduction && "Add the exact redirect_uri_we_use to your iRacing OAuth client redirect URLs.",
      url.protocol !== "https:" && isProduction && "Production should be served over HTTPS.",
    ].filter(Boolean),
  });
}
