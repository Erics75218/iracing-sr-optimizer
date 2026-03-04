import { NextResponse } from "next/server";

const COOKIE_NAME = "iracing_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * iRacing ID auth. Stores ID in a cookie for dashboard use; will later use it
 * to fetch data from the members-ng API (e.g. entitlements, schedule). No user
 * account or password handling in this app.
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
  res.cookies.set(COOKIE_NAME, idStr, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return res;
}
