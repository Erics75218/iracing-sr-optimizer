#!/usr/bin/env node
/**
 * Integration test: login (POST /api/auth with iRacing ID) then next request must see the cookie.
 * Run against a running server. Use before deploy to catch cookie/session bugs.
 *
 *   npm run dev
 *   # in another terminal:
 *   npm run test:auth-flow
 *
 *   # Or against Vercel (verifies cookies persist on production):
 *   BASE_URL=https://iracing-sr-optimizer.vercel.app npm run test:auth-flow
 */

const base = process.env.BASE_URL || process.env.PRODUCTION_URL || "http://127.0.0.1:3000";
const root = base.replace(/\/$/, "");
const testId = process.env.TEST_IRACING_ID || "999999";

function parseSetCookie(headers) {
  const setCookie = headers.get?.("set-cookie") || headers.get?.("Set-Cookie");
  if (!setCookie) return [];
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  const cookies = [];
  for (const raw of list) {
    const part = raw.split(";")[0].trim();
    const eq = part.indexOf("=");
    if (eq > 0) cookies.push({ name: part.slice(0, eq), value: part.slice(eq + 1) });
  }
  return cookies;
}

async function main() {
  console.log("Auth flow test");
  console.log("  BASE_URL:", root);
  console.log("  Test ID:", testId);
  console.log("");

  // 1. POST /api/auth with iRacing ID
  const postRes = await fetch(`${root}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iracingId: testId }),
    redirect: "manual",
  });
  if (!postRes.ok) {
    console.error("POST /api/auth failed:", postRes.status, await postRes.text());
    process.exit(1);
  }
  const cookies = parseSetCookie(postRes.headers);
  const idCookie = cookies.find((c) => c.name === "iracing_id");
  if (!idCookie) {
    console.error("POST /api/auth did not return Set-Cookie for iracing_id. All Set-Cookie:", cookies.map((c) => c.name));
    process.exit(1);
  }
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  // 2. GET /api/debug/auth with that cookie
  const getRes = await fetch(`${root}/api/debug/auth`, {
    headers: { Cookie: cookieHeader },
    redirect: "follow",
  });
  const text = await getRes.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("GET /api/debug/auth did not return JSON:", text.slice(0, 300));
    process.exit(1);
  }

  if (!data.cookies?.has_id_cookie) {
    console.error("FAIL: After login, GET /api/debug/auth with cookie did not see has_id_cookie.");
    console.error("Response:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("OK: Login sets iracing_id cookie and next request sees it.");

  // 3. In dev, verify state round-trips iRacing ID (dev-only endpoint)
  const stateRes = await fetch(`${root}/api/debug/state-roundtrip?id=${testId}`, { redirect: "follow" });
  if (stateRes.ok) {
    const stateData = await stateRes.json();
    if (!stateData.idRestored || !stateData.verifierOk) {
      console.error("FAIL: State round-trip failed:", stateData);
      process.exit(1);
    }
    console.log("OK: OAuth state round-trips iRacing ID and verifier.");
  }
  // If 404, skip (production or route disabled)
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
