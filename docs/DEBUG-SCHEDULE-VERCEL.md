# Schedule / weekly series works locally but not on Vercel

Use this to debug why the app shows no (or empty) weekly series data on Vercel while it works locally.

---

## Step 1: Run the diagnostic (do this first)

While **logged in and connected to iRacing** on the **Vercel** app, open in the same browser:

**https://iracing-sr-optimizer.vercel.app/api/debug/schedule-steps**

(or your production URL + `/api/debug/schedule-steps`).

The response is JSON with:

- **step1_seasons_with_params** – Call to `series/seasons` with current season year/quarter.
  - `ok`: did the API call succeed?
  - `itemsCount`: number of season items we could parse from the response (0 = we didn’t recognize the payload shape).
  - `dataKeys`: if the response is an object, the top-level keys (helps see if we got `{ link: "..." }` vs `{ data: [...] }` vs something else).
  - `error`: if the request failed (timeout, 4xx, 5xx).
- **step2_seasons_no_params** – Only present if step1 had `itemsCount === 0`. Retry of `series/seasons` without year/quarter.
- **step3_series_get** – Call to `series/get` (used for series names). `ok` / `error`.
- **theory** – A short suggestion based on the results.

**How to use it:**  
If step1 has `ok: false` and an `error`, the problem is that first API call (auth, timeout, or network).  
If step1 has `ok: true` but `itemsCount: 0`, the API returned something we don’t parse (check `dataKeys` and add support or adjust parsing).  
If step1 has `itemsCount > 0` but the UI still has no series, the issue is elsewhere (e.g. cache or token not reaching the page).

---

## Theories and fixes (pick based on diagnostic)

### Theory A: Request timeout (15s) from Vercel

**Symptom:** step1 or step2 has `error` mentioning timeout or 15.

**Why:** Serverless cold start + network latency to iRacing can exceed our 15s timeout. First request fails, we may cache null for 2 minutes.

**Fixes (choose one or combine):**

1. **Increase timeout** in `src/lib/iracing-api.ts` (e.g. `AbortSignal.timeout(25000)`). Simple but can still fail on slow runs.
2. **Don’t cache null** in `src/lib/fetch-schedule.ts`: if `fetchCurrentSeasonScheduleInner` returns null, skip putting it in `unstable_cache` (e.g. cache only when result is non-null, or use a very short revalidate when null) so the next request retries instead of reusing null.
3. **Retry once on timeout** inside `iracingDataGet` or in the schedule inner: on timeout, retry the same request once before returning failure.

---

### Theory B: API response shape different from Vercel

**Symptom:** step1 has `ok: true`, `itemsCount: 0`, and `dataKeys` like `["link"]` or something we don’t handle.

**Why:** iRacing may return `{ link: "https://..." }`; we follow the link and parse the linked response. If the **linked** response has a different shape (e.g. different key for the array), `toSeasonItems` returns 0. Or the link URL might behave differently when requested from Vercel (e.g. different CDN or region).

**Fixes:**

1. **Inspect `dataKeys`** from the diagnostic. If the final payload (after following the link) has keys we don’t handle in `toSeasonItems` in `src/lib/fetch-schedule.ts`, add that key (e.g. `championships`, `seasons`, etc.) to the list we try.
2. **Log or return the raw shape** in the diagnostic (e.g. first 500 chars of JSON or keys of the first item) so we can add the right parsing without guessing.

---

### Theory C: Token not available or not sent on Vercel

**Symptom:** step1 has `ok: false` with 401/403, or diagnostic returns 401 “Not connected”.

**Why:** Access token is in a cookie; on Vercel the cookie might not be sent (domain/path/secure), or the layout runs in a context where `cookies()` doesn’t see it.

**Fixes:**

1. **Confirm cookie** in the same tab: open `/api/debug/auth` and check `cookies.connected` and `cookies.has_oauth_access`. If false, fix cookie settings (e.g. same domain, secure, sameSite).
2. **Ensure token is passed** from layout to data fetchers; we already use `getAccessToken(cookieStore)` in the layout. If the dashboard page runs in a different execution (edge vs node), ensure it also reads the same cookies.

---

### Theory D: Cached null after first failure

**Symptom:** First load after deploy fails (e.g. timeout), then all subsequent loads are empty for ~2 minutes, even though the diagnostic might succeed when run later (because the diagnostic doesn’t use the cache).

**Why:** We use `unstable_cache(..., { revalidate: 120 })`. If the first request returns null, we cache null; every request for 2 minutes gets null.

**Fixes:**

1. **Do not cache null**: only call `unstable_cache` when the inner function returns a non-null season; if it returns null, either skip caching (so next request runs again) or use a very short revalidate (e.g. 10s) when the result is null.
2. **Bypass cache when result is null**: e.g. in the wrapper, if the inner returns null, return null without storing in cache; only cache successful results.

---

### Theory E: Different “current” season (year/quarter) on server

**Symptom:** step1 returns `ok: true` and `itemsCount > 0` on diagnostic, but the UI still shows no series; or step1 has 0 items but you expect the current season to have data.

**Why:** `getCurrentSeasonYearQuarter()` uses the server’s clock. If the server is in a different timezone or the season boundary is different, we might request the “wrong” season.

**Fixes:**

1. **Return season_year and season_quarter** in the diagnostic (we already do). Compare with what you expect (e.g. iRacing’s current season).
2. If they’re wrong, adjust `getCurrentSeasonYearQuarter()` (e.g. use a specific timezone or align with iRacing’s published season dates).

---

## What to do next

1. **Run the diagnostic** on Vercel (connected) and note:
   - step1 ok / itemsCount / dataKeys / error
   - step2 (if present) ok / itemsCount / dataKeys / error
   - step3 ok / error
   - the suggested **theory** in the response.
2. **Pick a theory** from above that matches (A–E) and apply the corresponding fix(es).
3. **Redeploy and re-check** the diagnostic and the UI. If step1 has `itemsCount > 0` but the UI is still empty, the problem is cache or token propagation (D or C).

If you paste the JSON from `/api/debug/schedule-steps` (with any tokens/IDs redacted), we can choose the exact fix together.
