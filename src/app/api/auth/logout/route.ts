import { NextResponse } from "next/server";

import { IRACING_ID_COOKIE } from "@/lib/auth";
const COOKIE_NAME = IRACING_ID_COOKIE;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL("/", url.origin));
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
