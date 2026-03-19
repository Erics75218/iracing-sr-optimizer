import { NextRequest, NextResponse } from "next/server";
import { IRACING_OAUTH } from "@/lib/iracing-oauth";
import { IRACING_ID_COOKIE, IRACING_ID_COOKIE_OPTIONS } from "@/lib/auth";

/**
 * Import iRacing OAuth tokens into the *local* origin.
 *
 * This is used when we intentionally start OAuth using a non-local (usually production) redirect URI
 * so iRacing doesn't require localhost redirect URI registration in OAuth client settings.
 *
 * GET /api/auth/iracing/import?access_token=...&expires_at=...&refresh_token=...&iracing_id=...&nonce=...
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams;

  const accessToken = q.get("access_token") ?? "";
  const expiresAt = q.get("expires_at") ?? "";
  const refreshToken = q.get("refresh_token") ?? "";
  const iracingId = q.get("iracing_id") ?? "";
  const nonce = q.get("nonce") ?? "";

  if (!accessToken || !expiresAt || !nonce) {
    return NextResponse.json({ ok: false, error: "Missing required params" }, { status: 400 });
  }

  const cookieNonce = req.cookies.get(IRACING_OAUTH.IMPORT_NONCE_COOKIE)?.value ?? "";
  // Some local flows may lose the cookie due to host/redirect differences (e.g. localhost vs 127.0.0.1).
  // To keep local development working, accept the URL nonce when the cookie is missing.
  // Still fail when the cookie exists but doesn't match.
  if (cookieNonce && cookieNonce !== nonce) {
    return NextResponse.json({ ok: false, error: "Invalid nonce" }, { status: 401 });
  }

  const secure = req.url.startsWith("https://");

  const resp = NextResponse.redirect(new URL("/dashboard", url.origin));

  // Set OAuth cookies for this origin.
  const opts = { ...IRACING_OAUTH.COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30, secure };
  resp.cookies.set(IRACING_OAUTH.ACCESS_TOKEN_COOKIE, accessToken, opts);
  resp.cookies.set(IRACING_OAUTH.EXPIRES_AT_COOKIE, expiresAt, opts);
  if (refreshToken) {
    resp.cookies.set(IRACING_OAUTH.REFRESH_TOKEN_COOKIE, refreshToken, opts);
  }

  // Set iRacing ID cookie so the dashboard/profile pages can render.
  if (iracingId.trim() !== "") {
    resp.cookies.set(IRACING_ID_COOKIE, iracingId.trim(), { ...IRACING_ID_COOKIE_OPTIONS, secure });
  }

  // Clear the nonce cookie (one-time import).
  resp.cookies.set(IRACING_OAUTH.IMPORT_NONCE_COOKIE, "", { path: "/", maxAge: 0, secure });

  return resp;
}

