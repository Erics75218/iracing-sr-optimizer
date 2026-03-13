import { NextRequest, NextResponse } from "next/server";
import { createStateWithVerifier, getIracingIdFromState, getVerifierFromState } from "@/lib/iracing-oauth";

/** Only in development: verify state round-trips iRacing ID (no real secrets used). */
const TEST_SECRET = "test-state-roundtrip-secret";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const id = request.nextUrl.searchParams.get("id") ?? "12345";
  const verifier = "test-verifier-" + Math.random().toString(36).slice(2);
  const state = createStateWithVerifier(verifier, TEST_SECRET, id);
  const decodedId = getIracingIdFromState(state, TEST_SECRET);
  const verifierOk = getVerifierFromState(state, TEST_SECRET) === verifier;
  return NextResponse.json({
    ok: true,
    idRestored: decodedId === id,
    verifierOk,
  });
}
