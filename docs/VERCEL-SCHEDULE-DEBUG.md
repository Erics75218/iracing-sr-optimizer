# Schedule works locally but not on Vercel

## Why this can happen

1. **Different API response shape**  
   The iRacing Data API sometimes returns payloads in different shapes (e.g. camelCase vs snake_case, or different key names like `schedule` vs `schedules`). The app now tries several key names when parsing. If iRacing returns something else on their side, we might still miss it.

2. **Link fetch without auth**  
   The API often returns `{ link: "https://..." }` and we fetch that URL to get the actual data. That second request is unauthenticated. If that URL behaves differently when requested from Vercel’s IP (e.g. different payload or failure), you’d see series names (from the first request or from `series/get`) but no or empty schedule data.

3. **Caching / cold start**  
   On Vercel, the first request after a cold start might hit the API once; if that response is empty or fails, it can be cached for a short time and affect subsequent requests.

4. **Timeout or network**  
   The iRacing API can be slow. We use a 15s timeout. On Vercel, cold starts plus network latency might occasionally cause timeouts or different behavior.

## Debug endpoint

After you’re **connected to iRacing** (so the app has your token), open:

- **Locally:** `http://127.0.0.1:3000/api/debug/schedule`
- **Vercel:** `https://<your-app>.vercel.app/api/debug/schedule`

The response is JSON with no secrets, for example:

- `seriesCount` – number of series in the season we built
- `seriesWithSessions` – how many of those have at least one session (week)
- `totalSessions` – total session count across all series

If on Vercel you see `seriesCount > 0` but `seriesWithSessions === 0` or `totalSessions === 0`, the API is giving us series but no (or empty) schedule data for each series. If `seriesCount === 0`, the initial schedule fetch or parsing is failing.

## What we changed in code

- **More response keys** when finding the season list: `seasons`, `data`, `series`, `schedule`, `season_list`, and a fallback over object values.
- **More keys for per-series schedule** in each item: `schedules`, `schedule`, `raceSchedule`, `race_schedule`.
- **Debug route** at `/api/debug/schedule` to compare local vs Vercel without logging tokens.

## If sessions are still 0 on Vercel

- Call the debug URL on Vercel (while connected) and note the numbers.
- If you can, compare with the same URL locally right after (same account).
- If the link URL is only valid with auth, we’d need to pass the Bearer token when fetching the link (current code does not). That would require a change in `src/lib/iracing-api.ts` to optionally send the token on the link fetch.
