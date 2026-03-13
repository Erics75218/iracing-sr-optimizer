#!/usr/bin/env node
/**
 * Test auth endpoints on Vercel (or any deployment).
 * Usage:
 *   PRODUCTION_URL=https://your-app.vercel.app node scripts/test-vercel-auth.mjs
 *   node scripts/test-vercel-auth.mjs https://your-app.vercel.app
 *
 * Prints /api/debug/auth and /api/auth/iracing/status so you can verify:
 * - redirect_uri_we_use (must match iRacing OAuth client exactly)
 * - production_redirect_approved (must be true on Vercel)
 * - oauth_env_configured
 * - cookies (will be false when called without browser cookies)
 *
 * To test login: open PRODUCTION_URL in browser, enter ID, then open PRODUCTION_URL/api/debug/auth
 * and check cookies.has_id_cookie. To test Connect: click Connect, complete iRacing, then check
 * cookies.connected.
 */

const base = process.env.PRODUCTION_URL || process.argv[2] || "http://127.0.0.1:3000";
const root = base.replace(/\/$/, "");

async function get(path) {
  const url = `${root}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { _url: url, _status: res.status, _body: text.slice(0, 200) };
  }
  return { _url: url, _status: res.status, ...json };
}

async function main() {
  console.log("Base URL:", root);
  console.log("");

  const [auth, status] = await Promise.all([
    get("/api/debug/auth"),
    get("/api/auth/iracing/status"),
  ]);

  console.log("GET /api/debug/auth");
  console.log(JSON.stringify(auth, null, 2));
  console.log("");

  console.log("GET /api/auth/iracing/status");
  console.log(JSON.stringify(status, null, 2));
  console.log("");

  if (auth.hints?.length) {
    console.log("Hints:");
    auth.hints.forEach((h) => console.log("  -", h));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
