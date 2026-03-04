/**
 * Mock season/schedule data for UI and recommendation logic until the iRacing API is available.
 * Shape matches iracing-types so we can swap in real API data later.
 */

import type { Season } from "./iracing-types";

export const MOCK_SEASON: Season = {
  season_id: 202501,
  season_year: 2025,
  season_quarter: 1,
  series: [
    {
      series_id: 1,
      series_name: "Formula 1600 (Free)",
      category_id: 2,
      sessions: [
        { race_week_num: 1, track: { track_id: 1, track_name: "Lime Rock Park", config_name: null, lap_count: 20 }, duration_minutes: 20 },
        { race_week_num: 2, track: { track_id: 2, track_name: "Laguna Seca", config_name: null, lap_count: 15 }, duration_minutes: 25 },
        { race_week_num: 3, track: { track_id: 3, track_name: "Summit Point", config_name: "Summit Point Raceway", lap_count: 18 }, duration_minutes: 20 },
      ],
    },
    {
      series_id: 2,
      series_name: "Global MX-5 Cup",
      category_id: 2,
      sessions: [
        { race_week_num: 1, track: { track_id: 10, track_name: "Okayama Short", config_name: null, lap_count: 25 }, duration_minutes: 25 },
        { race_week_num: 2, track: { track_id: 11, track_name: "Watkins Glen", config_name: "Full", lap_count: 12 }, duration_minutes: 30 },
      ],
    },
  ],
};
