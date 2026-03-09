import { createHash, randomBytes } from "node:crypto";

const OAUTH_AUTHORIZE = "https://oauth.iracing.com/oauth2/authorize";
const OAUTH_TOKEN = "https://oauth.iracing.com/oauth2/token";
const SCOPE = "iracing.auth";

/** iRacing requires client_secret (and password) to be masked: SHA256(secret + normalized_id) then base64. */
function maskSecret(secret: string, id: string): string {
  const normalizedId = id.trim().toLowerCase();
  return createHash("sha256").update(secret + normalizedId).digest("base64");
}

export const IRACING_OAUTH = {
  /** Cookie that stores PKCE code_verifier during the flow (short-lived). */
  VERIFIER_COOKIE: "iracing_oauth_verifier",
  /** Cookie that stores state for CSRF (short-lived). */
  STATE_COOKIE: "iracing_oauth_state",
  ACCESS_TOKEN_COOKIE: "iracing_access_token",
  REFRESH_TOKEN_COOKIE: "iracing_refresh_token",
  EXPIRES_AT_COOKIE: "iracing_expires_at",
  COOKIE_OPTIONS: { path: "/", sameSite: "lax" as const, httpOnly: true },
} as const;

/** Generate PKCE code_verifier (43–128 chars) and S256 code_challenge. */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url"); // 43 chars
  const hash = createHash("sha256").update(verifier).digest();
  const challenge = hash.toString("base64url");
  return { verifier, challenge };
}

/** Build the iRacing authorize URL (user is sent here to log in). */
export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", params.state);
  u.searchParams.set("scope", SCOPE);
  return u.toString();
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

/** Exchange authorization code for tokens. */
export async function exchangeCode(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });
  if (params.clientSecret) {
    body.set("client_secret", maskSecret(params.clientSecret, params.clientId));
  }
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}

/** Refresh access token using refresh_token. */
export async function refreshAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: params.clientId,
    refresh_token: params.refreshToken,
  });
  if (params.clientSecret) {
    body.set("client_secret", maskSecret(params.clientSecret, params.clientId));
  }
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}

/** Read access token from cookies only (no refresh). Use in Server Components. Returns null if missing or expired. */
export function getAccessToken(cookies: {
  get: (name: string) => { value: string } | undefined;
}): string | null {
  const token = cookies.get(IRACING_OAUTH.ACCESS_TOKEN_COOKIE)?.value;
  const expiresAt = cookies.get(IRACING_OAUTH.EXPIRES_AT_COOKIE)?.value;
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const buffer = 60;
  const expiry = expiresAt ? parseInt(expiresAt, 10) : 0;
  if (expiry <= now + buffer) return null;
  return token;
}

export type ValidTokenResult =
  | { token: string; setCookies?: never }
  | { token: null; setCookies?: never }
  | { token: string; setCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> };

/** Get a valid access token from cookies; refresh if expired. Call from API routes so you can apply setCookies to the response. */
export async function getValidAccessToken(cookies: {
  get: (name: string) => { value: string } | undefined;
}): Promise<ValidTokenResult> {
  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET ?? "";
  if (!clientId) return { token: null };

  const accessToken = cookies.get(IRACING_OAUTH.ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookies.get(IRACING_OAUTH.REFRESH_TOKEN_COOKIE)?.value;
  const expiresAt = cookies.get(IRACING_OAUTH.EXPIRES_AT_COOKIE)?.value;
  const now = Math.floor(Date.now() / 1000);
  const expiry = expiresAt ? parseInt(expiresAt, 10) : 0;
  const buffer = 60; // consider expired 60s early

  if (accessToken && expiry > now + buffer) {
    return { token: accessToken };
  }
  if (!refreshToken) return { token: null };

  try {
    const data = await refreshAccessToken({
      clientId,
      clientSecret,
      refreshToken,
    });
    const newExpiresAt = String(now + (data.expires_in ?? 600));
    const opts = { ...IRACING_OAUTH.COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 }; // 30 days
    return {
      token: data.access_token,
      setCookies: [
        { name: IRACING_OAUTH.ACCESS_TOKEN_COOKIE, value: data.access_token, options: opts },
        { name: IRACING_OAUTH.EXPIRES_AT_COOKIE, value: newExpiresAt, options: opts },
        ...(data.refresh_token
          ? [{ name: IRACING_OAUTH.REFRESH_TOKEN_COOKIE, value: data.refresh_token, options: opts } as const]
          : []),
      ],
    };
  } catch {
    return { token: null };
  }
}
