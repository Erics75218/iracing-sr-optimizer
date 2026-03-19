import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Force a single local host to avoid OAuth/cookie host-mismatch:
 * If someone hits http://localhost:3000/... we redirect to http://127.0.0.1:3000/...
 *
 * This keeps the OAuth redirect_uri + cookies on the same host, so "Connect" works reliably.
 */
export function middleware(req: NextRequest) {
  const hostHeader = req.headers.get("host") ?? "";
  const isLocalhost =
    hostHeader === "localhost" ||
    hostHeader.startsWith("localhost:") ||
    req.nextUrl.hostname === "localhost";

  if (!isLocalhost) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.hostname = "127.0.0.1";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/:path*",
};

