import { NextRequest, NextResponse } from "next/server";

/**
 * Check if iRacing OAuth env vars are set (for debugging). Does not expose values.
 * Also returns the redirect_uri we use so you can match it exactly in iRacing.
 */
export async function GET(request: NextRequest) {
  const hasId = Boolean(process.env.IRACING_CLIENT_ID?.trim());
  const hasSecret = Boolean(process.env.IRACING_CLIENT_SECRET?.trim());
  const configured = hasId && hasSecret;
  const url = new URL(request.url);
  const redirectUri =
    process.env.IRACING_REDIRECT_URI ?? `${url.origin}/api/auth/iracing/callback`;
  return NextResponse.json({
    configured,
    IRACING_CLIENT_ID: hasId ? "set" : "missing",
    IRACING_CLIENT_SECRET: hasSecret ? "set" : "missing",
    redirect_uri_we_use: redirectUri,
    fix: "In iRacing OAuth client, add this EXACT redirect URI (no trailing slash).",
  });
}
