import { NextRequest, NextResponse } from "next/server";
import { IRACING_ID_COOKIE, IRACING_ID_COOKIE_OPTIONS } from "@/lib/auth";
import { iracingDataGet } from "@/lib/iracing-api";
import {
  exchangeCode,
  getVerifierFromState,
  getIracingIdFromState,
  getReturnOriginFromState,
  getImportNonceFromState,
  IRACING_OAUTH,
} from "@/lib/iracing-oauth";

/**
 * iRacing OAuth callback: exchange code for tokens, set cookies, redirect to dashboard.
 * Preserves existing iRacing ID cookie and, when possible, sets it from the API (cust_id).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const dashboardUrl = new URL("/dashboard", origin);

  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    dashboardUrl.searchParams.set("error", "oauth_not_configured");
    return NextResponse.redirect(dashboardUrl);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const existingIracingId = request.cookies.get(IRACING_ID_COOKIE)?.value?.trim();

  const secure = url.protocol === "https:";
  if (oauthError === "unauthorized_client") {
    dashboardUrl.searchParams.set("error", "oauth_unauthorized_client");
    const res = NextResponse.redirect(dashboardUrl);
    clearOAuthCookies(res, secure);
    return res;
  }

  // redirect_uri used in /authorize must match exactly this callback URL.
  // When we start OAuth from localhost we intentionally use the production redirect URI,
  // so this callback will also be invoked on the production origin.
  const redirectUri = `${origin}/api/auth/iracing/callback`;

  // Prefer verifier from signed state (works when cookies aren't sent, e.g. localhost vs 127.0.0.1)
  let verifier =
    state && clientSecret ? getVerifierFromState(state, clientSecret) : null;
  if (!verifier) {
    const savedState = request.cookies.get(IRACING_OAUTH.STATE_COOKIE)?.value;
    if (state && state === savedState) {
      verifier = request.cookies.get(IRACING_OAUTH.VERIFIER_COOKIE)?.value ?? null;
    }
  }

  if (!code || !verifier || !state) {
    dashboardUrl.searchParams.set("error", "oauth_callback_invalid");
    if (!code) dashboardUrl.searchParams.set("missing", "code");
    else if (!state) dashboardUrl.searchParams.set("missing", "state");
    else dashboardUrl.searchParams.set("missing", "verifier");
    const res = NextResponse.redirect(dashboardUrl);
    clearOAuthCookies(res, secure);
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
    const opts = { ...IRACING_OAUTH.COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30, secure };

    const returnOrigin =
      state && clientSecret ? getReturnOriginFromState(state, clientSecret) : null;
    const importNonce =
      state && clientSecret ? getImportNonceFromState(state, clientSecret) : null;

    // If we started from localhost, we import the token back into the local origin.
    // Otherwise we fall back to the original behavior: set cookies here and redirect to /dashboard.
    const shouldImportToReturnOrigin =
      returnOrigin != null &&
      typeof returnOrigin === "string" &&
      returnOrigin.includes("://") &&
      importNonce != null &&
      importNonce !== "";

    const res = shouldImportToReturnOrigin
      ? new NextResponse(
          redirectHtml(
            buildImportUrl({
              returnOrigin: returnOrigin!,
              accessToken: data.access_token,
              expiresAt,
              refreshToken: data.refresh_token,
              iracingId: "", // filled after member/info
              nonce: importNonce!,
            })
          ),
          {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }
        )
      : new NextResponse(redirectHtml(dashboardUrl.toString()), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });

    clearOAuthCookies(res, secure); // clear verifier/state on this origin

    // Keep iRacing ID: prefer cust_id from API, then ID we stored in state (so Connect doesn't drop it when callback has no cookies), then existing cookie
    const idFromState = state && clientSecret ? getIracingIdFromState(state, clientSecret) : null;
    let idToSet = existingIracingId ?? idFromState ?? "";
    const memberResult = await iracingDataGet<{ cust_id?: number }>("member/info", {
      token: data.access_token,
    });
    if (memberResult.ok && memberResult.data?.cust_id != null) {
      idToSet = String(memberResult.data.cust_id);
    }
    if (idToSet && !shouldImportToReturnOrigin) {
      // Normal flow: keep iRacing ID cookie on this origin.
      res.cookies.set(IRACING_ID_COOKIE, idToSet, { ...IRACING_ID_COOKIE_OPTIONS, secure });
    }
    // Debug: where did the ID come from? (state = from OAuth state, cookie = from request, api = from member/info)
    const idSource = memberResult.ok && memberResult.data?.cust_id != null ? "api" : idFromState ? "state" : existingIracingId ? "cookie" : "none";
    res.headers.set("X-Debug-ID-Source", idSource);

    if (!shouldImportToReturnOrigin) {
      res.cookies.set(IRACING_OAUTH.ACCESS_TOKEN_COOKIE, data.access_token, opts);
      res.cookies.set(IRACING_OAUTH.EXPIRES_AT_COOKIE, expiresAt, opts);
      if (data.refresh_token) {
        res.cookies.set(IRACING_OAUTH.REFRESH_TOKEN_COOKIE, data.refresh_token, opts);
      }
    }

    // Import flow: rebuild import URL now that we know iRacing ID.
    if (shouldImportToReturnOrigin && idToSet) {
      return new NextResponse(
        redirectHtml(
          buildImportUrl({
            returnOrigin: returnOrigin!,
            accessToken: data.access_token,
            expiresAt,
            refreshToken: data.refresh_token,
            iracingId: idToSet,
            nonce: importNonce!,
          })
        ),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    return res;
  } catch (err) {
    dashboardUrl.searchParams.set("error", "oauth_token_exchange_failed");
    const res = NextResponse.redirect(dashboardUrl);
    clearOAuthCookies(res, secure);
    return res;
  }
}

function redirectHtml(dashboardUrl: string): string {
  const safe = dashboardUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  // Delay client redirect so the browser has time to persist Set-Cookie before navigating (fixes "back to dashboard unconnected" in some browsers).
  const delayMs = 400;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="${delayMs / 1000};url=${safe}"><script>setTimeout(function(){ window.location.replace(${JSON.stringify(dashboardUrl)}); }, ${delayMs});</script></head><body><p>Redirecting to <a href="${safe}">dashboard</a>…</p></body></html>`;
}

function clearOAuthCookies(res: NextResponse, secure = false) {
  res.cookies.set(IRACING_OAUTH.VERIFIER_COOKIE, "", { path: "/", maxAge: 0, secure });
  res.cookies.set(IRACING_OAUTH.STATE_COOKIE, "", { path: "/", maxAge: 0, secure });
}

function buildImportUrl(params: {
  returnOrigin: string;
  accessToken: string;
  expiresAt: string;
  refreshToken?: string;
  iracingId: string;
  nonce: string;
}): string {
  const u = new URL("/api/auth/iracing/import", params.returnOrigin);
  u.searchParams.set("access_token", params.accessToken);
  u.searchParams.set("expires_at", params.expiresAt);
  if (params.refreshToken) u.searchParams.set("refresh_token", params.refreshToken);
  u.searchParams.set("iracing_id", params.iracingId);
  u.searchParams.set("nonce", params.nonce);
  return u.toString();
}
