import { NextResponse } from "next/server";

/**
 * Check if iRacing OAuth env vars are set (for debugging). Does not expose values.
 */
export async function GET() {
  const hasId = Boolean(process.env.IRACING_CLIENT_ID?.trim());
  const hasSecret = Boolean(process.env.IRACING_CLIENT_SECRET?.trim());
  const configured = hasId && hasSecret;
  return NextResponse.json({
    configured,
    IRACING_CLIENT_ID: hasId ? "set" : "missing",
    IRACING_CLIENT_SECRET: hasSecret ? "set" : "missing",
  });
}
