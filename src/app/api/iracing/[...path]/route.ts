import { NextRequest, NextResponse } from "next/server";
import { iracingDataGet } from "@/lib/iracing-api";
import { getValidAccessToken } from "@/lib/iracing-oauth";

/**
 * Proxy to iRacing Data API. GET /api/iracing/constants/divisions etc.
 * Uses OAuth tokens from cookies (set by "Connect to iRacing"); refreshes token if expired.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path?.length) {
    return NextResponse.json(
      { error: "Missing path, e.g. /api/iracing/constants/divisions" },
      { status: 400 }
    );
  }
  const dataPath = path.join("/");
  const tokenResult = await getValidAccessToken(request.cookies);
  const token = tokenResult.token ?? undefined;
  const result = await iracingDataGet(dataPath, { token });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status >= 400 ? result.status : 502 }
    );
  }
  const res = NextResponse.json(result.data);
  if (tokenResult.setCookies) {
    for (const c of tokenResult.setCookies) {
      res.cookies.set(c.name, c.value, c.options as { path: string; sameSite: "lax"; httpOnly: boolean; maxAge: number });
    }
  }
  return res;
}
