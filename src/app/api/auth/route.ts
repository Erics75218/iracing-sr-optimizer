import { NextResponse } from "next/server";
import { IRACING_ID_COOKIE, IRACING_ID_COOKIE_OPTIONS } from "@/lib/auth";

/**
 * iRacing ID auth. Stores ID in a cookie for dashboard use.
 * Only sets the iRacing ID cookie; does not touch OAuth cookies (so Connect to iRacing stays valid).
 */
export async function POST(request: Request) {
  let body: { iracingId?: string | number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const iracingId = body.iracingId;
  if (iracingId === undefined || iracingId === null) {
    return NextResponse.json(
      { error: "iRacing ID is required" },
      { status: 400 }
    );
  }

  const idStr = String(iracingId).trim();
  if (idStr === "") {
    return NextResponse.json(
      { error: "iRacing ID cannot be empty" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, message: "Auth stub" });
  res.cookies.set(IRACING_ID_COOKIE, idStr, IRACING_ID_COOKIE_OPTIONS);
  return res;
}
