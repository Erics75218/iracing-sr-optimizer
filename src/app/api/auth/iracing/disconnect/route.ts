import { NextRequest, NextResponse } from "next/server";
import { IRACING_OAUTH } from "@/lib/iracing-oauth";

/** Clear iRacing OAuth cookies and redirect to dashboard. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL("/dashboard", url.origin));
  res.cookies.set(IRACING_OAUTH.ACCESS_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(IRACING_OAUTH.REFRESH_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(IRACING_OAUTH.EXPIRES_AT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
