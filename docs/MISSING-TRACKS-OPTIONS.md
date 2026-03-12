# Better ways to discover missing track data

Right now we discover gaps when you see a track with no turn/corner data and report it. Below are systematic alternatives.

---

## Option A: In-app “Missing tracks” report (recommended)

**What:** When you’re connected to iRacing, the app fetches the current season schedule and the full track list from the API. We compare every track+config that appears in the schedule to our merged index (API + static). Any schedule track we can’t resolve to turn_count + length_miles is “missing.”

**Where:** A small section on the Dashboard (or a “Track data” / “Data status” link) that lists those missing tracks with their **exact** `track_name` and `config_name` as returned by the API, so we can add them to the static index with the correct names.

**Pros:** Uses live schedule data, no manual reporting, you see gaps in one place.  
**Cons:** Only covers tracks that appear in the **current** season schedule.

---

## Option B: CLI script to report missing tracks

**What:** A script (e.g. `npm run report-missing-tracks`) that uses your token (from `.env` or a flag), fetches the current season schedule and optionally `track/get`, and prints or writes to a file every track+config that appears in the schedule but doesn’t have turn_count/length_miles in our index. Output can be plain list or copy-pasteable index entries (with placeholder 0,0 for you to fill).

**Pros:** Run on demand or in CI; can output to a file; good for maintainers.  
**Cons:** Requires running a command with a valid token.

---

## Option C: Rely on API track data when connected

**What:** The iRacing `GET /data/track/get` endpoint (used when you’re connected) may already return length and corner/turn data for every track+config. If we **verify the real API response shape** and fix our normalizer in `fetch-tracks.ts` so we ingest all of it, then when you’re connected we’d have full coverage from the API and the static index would only matter for unauthenticated users or as fallback.

**Pros:** One-time fix; no manual index updates for tracks the API covers.  
**Cons:** We need to confirm the API actually returns length/corners for every layout; if not, we’d still have gaps and would combine with A or B.

---

## Recommendation

- **Implement Option A** so you get an in-app list of “schedule tracks missing data” with exact names, and we can add them (including Motegi/Long Beach and any future ones) without you having to catch them by eye.
- **Optionally add Option B** later for a scripted report (e.g. for release checks).
- **Option C** is worth doing in parallel: log or inspect the real `track/get` response and adjust the normalizer so API data is used when available; that reduces how much we depend on the static list when you’re connected.

If you tell me which option(s) you want (e.g. “A only” or “A and B”), I’ll implement that next.
