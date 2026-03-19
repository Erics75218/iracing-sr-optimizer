#!/usr/bin/env node
/**
 * Call iRacing API directly for F4 Asia Pacific schedule. No Next.js, no app logic.
 * Run: IRACING_ACCESS_TOKEN=<your_bearer_token> node scripts/f4-asia-raw.mjs
 * (Get token: log in to the app, then in DevTools Application → Cookies copy the value that holds the access token, or use a debug auth endpoint if you have one.)
 */
const BASE = "https://members-ng.iracing.com/data";
const SEASON_ID = 6133;
const SERIES_ID = 540;

const token = process.env.IRACING_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Set IRACING_ACCESS_TOKEN and run again.");
  process.exit(1);
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Accept: "application/json", ...opts.headers },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const url = `${BASE}/series/season_schedule?season_id=${SEASON_ID}`;
  console.error("Fetching:", url);
  let data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (data.link) {
    console.error("Following link...");
    data = await fetchJson(data.link);
  } else if (data.data !== undefined) {
    data = data.data;
  }

  const schedules = Array.isArray(data.schedules) ? data.schedules : [];
  const f4 = schedules.filter((s) => (s.series_id ?? s.seriesId) === SERIES_ID);
  const byWeek = f4.slice().sort((a, b) => (a.race_week_num ?? a.raceWeekNum ?? 0) - (b.race_week_num ?? b.raceWeekNum ?? 0));

  console.log(JSON.stringify({
    note: "Raw iRacing API response for series/season_schedule(6133), series_id 540",
    season_id: data.season_id,
    success: data.success,
    total_schedule_items: schedules.length,
    items_for_series_540: f4.length,
    schedule_by_week: byWeek.map((s) => ({
      race_week_num: s.race_week_num ?? s.raceWeekNum,
      week_num: ((s.race_week_num ?? s.raceWeekNum ?? 0) + 1),
      track_id: s.track?.track_id,
      track_name: s.track?.track_name ?? s.track?.trackName,
      config_name: s.track?.config_name ?? s.track?.configName ?? null,
    })),
    raw_schedules_for_540: f4,
    full_raw_response: data,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
