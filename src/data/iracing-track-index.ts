/**
 * Canonical index of iRacing track + config data.
 *
 * This is the single source of truth for track layout data across the app.
 * Anywhere we need track "X" for a series (turns per mile, length, turn count),
 * we look up from this file via the helpers in track-layouts.ts.
 *
 * All iRacing tracks and configs are discoverable via the API: GET /data/track/get
 * returns the full list. That endpoint requires authentication, so we maintain
 * this static index for coverage when unauthenticated and as a fallback. When
 * we have a token, fetch-tracks.ts can load API track data and merge it for
 * complete coverage.
 *
 * To add or update tracks:
 * - Use the exact track_name and config_name as shown in the schedule (from the app or API).
 * - Use "" for config_name when the schedule has no config or a single layout.
 * - Optionally set track_id when you know the iRacing ID for that track (enables ID-based lookup).
 * - turn_count = number of corners; length_miles = track length in miles.
 */

export type IracingTrackIndexEntry = {
  /** iRacing track_id when known (enables lookup by ID from schedule) */
  track_id?: number;
  /** Exact track name as shown in schedule/API */
  track_name?: string;
  /** Config/layout name as shown in schedule (e.g. "Grand Prix", "Roval", "" for default) */
  config_name: string;
  /** Number of turns (corners) on this layout */
  turn_count: number;
  /** Track length in miles */
  length_miles: number;
};

export const IRACING_TRACK_INDEX: IracingTrackIndexEntry[] = [
  // ——— Road / Formula (FIA F4, open-wheel, etc.) ———
  { track_name: "Summit Point Raceway", config_name: "Summit Point Raceway", turn_count: 10, length_miles: 1.0 },
  { track_name: "Summit Point Raceway", config_name: "", turn_count: 10, length_miles: 1.0 },
  { track_name: "Lime Rock Park", config_name: "Grand Prix", turn_count: 8, length_miles: 1.5 },
  { track_name: "Lime Rock Park", config_name: "", turn_count: 8, length_miles: 1.5 },
  { track_name: "Oulton Park Circuit", config_name: "Fosters", turn_count: 17, length_miles: 2.69 },
  { track_name: "Oulton Park Circuit", config_name: "International", turn_count: 17, length_miles: 2.69 },
  { track_name: "Motorsport Arena Oschersleben", config_name: "Grand Prix", turn_count: 14, length_miles: 2.28 },
  { track_name: "Motorsport Arena Oschersleben", config_name: "", turn_count: 14, length_miles: 2.28 },
  { track_name: "Snetterton Circuit", config_name: "200", turn_count: 12, length_miles: 2.0 },
  { track_name: "Snetterton Circuit", config_name: "300", turn_count: 12, length_miles: 2.97 },
  { track_name: "Snetterton Circuit", config_name: "", turn_count: 12, length_miles: 2.0 },
  { track_name: "Rudskogen Motorsenter", config_name: "", turn_count: 12, length_miles: 1.85 },
  { track_name: "Red Bull Ring", config_name: "Grand Prix", turn_count: 10, length_miles: 2.683 },
  { track_name: "Red Bull Ring", config_name: "", turn_count: 10, length_miles: 2.683 },
  { track_name: "Circuit de Nevers Magny-Cours", config_name: "Grand Prix", turn_count: 17, length_miles: 2.741 },
  { track_name: "Circuit de Nevers Magny-Cours", config_name: "", turn_count: 17, length_miles: 2.741 },
  { track_name: "Circuito de Jerez", config_name: "Grand Prix", turn_count: 13, length_miles: 2.751 },
  { track_name: "Circuito de Jerez", config_name: "", turn_count: 13, length_miles: 2.751 },
  { track_name: "Autodromo Internazionale Enzo e Dino Ferrari", config_name: "Grand Prix", turn_count: 19, length_miles: 3.05 },
  { track_name: "Autodromo Internazionale Enzo e Dino Ferrari", config_name: "", turn_count: 19, length_miles: 3.05 },
  { track_name: "Donington Park Racing Circuit", config_name: "Grand Prix", turn_count: 12, length_miles: 2.5 },
  { track_name: "Donington Park Racing Circuit", config_name: "", turn_count: 12, length_miles: 2.5 },
  { track_name: "Algarve International Circuit", config_name: "Grand Prix", turn_count: 15, length_miles: 2.891 },
  { track_name: "Algarve International Circuit", config_name: "", turn_count: 15, length_miles: 2.891 },
  { track_name: "Nürburgring Grand Prix Strecke", config_name: "Grand Prix", turn_count: 15, length_miles: 3.199 },
  { track_name: "Nürburgring Grand Prix Strecke", config_name: "", turn_count: 15, length_miles: 3.199 },
  { track_name: "Brands Hatch Circuit", config_name: "Grand Prix", turn_count: 9, length_miles: 2.433 },
  { track_name: "Brands Hatch Circuit", config_name: "Indy", turn_count: 6, length_miles: 1.207 },
  { track_name: "Brands Hatch Circuit", config_name: "", turn_count: 9, length_miles: 2.433 },
  { track_name: "Watkins Glen International", config_name: "Full", turn_count: 11, length_miles: 3.4 },
  { track_name: "Watkins Glen International", config_name: "Boot", turn_count: 11, length_miles: 3.4 },
  { track_name: "Watkins Glen International", config_name: "", turn_count: 11, length_miles: 3.4 },
  { track_name: "Mid-Ohio Sports Car Course", config_name: "Full Course", turn_count: 15, length_miles: 2.4 },
  { track_name: "Mid-Ohio Sports Car Course", config_name: "", turn_count: 15, length_miles: 2.4 },
  { track_name: "Canadian Tire Motorsport Park", config_name: "Grand Prix", turn_count: 10, length_miles: 2.459 },
  { track_name: "Canadian Tire Motorsport Park", config_name: "", turn_count: 10, length_miles: 2.459 },
  { track_name: "Indianapolis Motor Speedway", config_name: "Road Course", turn_count: 14, length_miles: 2.439 },
  { track_name: "Indianapolis Motor Speedway", config_name: "", turn_count: 14, length_miles: 2.439 },
  { track_name: "WeatherTech Raceway at Laguna Seca", config_name: "Full Course", turn_count: 11, length_miles: 2.238 },
  { track_name: "WeatherTech Raceway at Laguna Seca", config_name: "", turn_count: 11, length_miles: 2.238 },
  { track_name: "Portland International Raceway", config_name: "Full", turn_count: 12, length_miles: 1.967 },
  { track_name: "Portland International Raceway", config_name: "", turn_count: 12, length_miles: 1.967 },
  { track_name: "Barber Motorsports Park", config_name: "", turn_count: 17, length_miles: 2.38 },
  { track_name: "Virginia International Raceway", config_name: "Full Course", turn_count: 17, length_miles: 3.27 },
  { track_name: "Virginia International Raceway", config_name: "Grand Prix", turn_count: 17, length_miles: 3.27 },
  { track_name: "Virginia International Raceway", config_name: "", turn_count: 17, length_miles: 3.27 },
  { track_name: "Autódromo José Carlos Pace", config_name: "Grand Prix", turn_count: 15, length_miles: 2.677 },
  { track_name: "Autódromo José Carlos Pace", config_name: "", turn_count: 15, length_miles: 2.677 },
  { track_name: "Sebring International Raceway", config_name: "International", turn_count: 17, length_miles: 3.74 },
  { track_name: "Sebring International Raceway", config_name: "", turn_count: 17, length_miles: 3.74 },
  { track_name: "Circuit de Lédenon", config_name: "Grand Prix", turn_count: 13, length_miles: 2.0 },
  { track_name: "Circuit de Lédenon", config_name: "", turn_count: 13, length_miles: 2.0 },
  { track_name: "Tsukuba Circuit", config_name: "", turn_count: 8, length_miles: 0.994 },
  { track_name: "Autodromo Nazionale Monza", config_name: "Grand Prix", turn_count: 11, length_miles: 3.6 },
  { track_name: "Autodromo Nazionale Monza", config_name: "", turn_count: 11, length_miles: 3.6 },
  { track_name: "Autodromo Internazionale del Mugello", config_name: "", turn_count: 15, length_miles: 3.259 },
  { track_name: "Suzuka International Racing Course", config_name: "Grand Prix", turn_count: 18, length_miles: 3.609 },
  { track_name: "Suzuka International Racing Course", config_name: "", turn_count: 18, length_miles: 3.609 },
  // ——— Japan (Super Formula Lights, etc.) ———
  { track_name: "Fuji International Speedway", config_name: "Grand Prix", turn_count: 16, length_miles: 2.835 },
  { track_name: "Fuji International Speedway", config_name: "", turn_count: 16, length_miles: 2.835 },
  { track_name: "Fuji Speedway", config_name: "Grand Prix", turn_count: 16, length_miles: 2.835 },
  { track_name: "Fuji Speedway", config_name: "", turn_count: 16, length_miles: 2.835 },
  { track_name: "Okayama International Circuit", config_name: "Full Course", turn_count: 13, length_miles: 2.301 },
  { track_name: "Okayama International Circuit", config_name: "", turn_count: 13, length_miles: 2.301 },
  { track_name: "Okayama International Circuit", config_name: "Short", turn_count: 8, length_miles: 1.215 },
  { track_name: "Okayama Short", config_name: "", turn_count: 8, length_miles: 1.215 },
  { track_name: "Twin Ring Motegi", config_name: "Road Course", turn_count: 14, length_miles: 3.0 },
  { track_name: "Twin Ring Motegi", config_name: "", turn_count: 14, length_miles: 3.0 },
  { track_name: "Motegi", config_name: "Road Course", turn_count: 14, length_miles: 3.0 },
  { track_name: "Motegi", config_name: "", turn_count: 14, length_miles: 3.0 },
  { track_name: "Long Beach Street Circuit", config_name: "Grand Prix", turn_count: 11, length_miles: 1.968 },
  { track_name: "Long Beach Street Circuit", config_name: "", turn_count: 11, length_miles: 1.968 },
  { track_name: "Long Beach", config_name: "Grand Prix", turn_count: 11, length_miles: 1.968 },
  { track_name: "Long Beach", config_name: "", turn_count: 11, length_miles: 1.968 },
  { track_name: "Autopolis International Racing Course", config_name: "International", turn_count: 18, length_miles: 2.904 },
  { track_name: "Autopolis International Racing Course", config_name: "", turn_count: 18, length_miles: 2.904 },
  { track_name: "Autopolis", config_name: "", turn_count: 18, length_miles: 2.904 },
  { track_name: "St. Petersburg Grand Prix", config_name: "Grand Prix", turn_count: 14, length_miles: 1.8 },
  { track_name: "St. Petersburg Grand Prix", config_name: "", turn_count: 14, length_miles: 1.8 },
  { track_name: "Circuit Zandvoort", config_name: "Grand Prix", turn_count: 14, length_miles: 2.646 },
  { track_name: "Circuit Zandvoort", config_name: "", turn_count: 14, length_miles: 2.646 },
  { track_name: "Knockhill Racing Circuit", config_name: "International", turn_count: 9, length_miles: 1.27 },
  { track_name: "Knockhill Racing Circuit", config_name: "National", turn_count: 10, length_miles: 1.0 },
  { track_name: "Knockhill Racing Circuit", config_name: "Tri-Oval", turn_count: 3, length_miles: 0.3 },
  { track_name: "Knockhill Racing Circuit", config_name: "", turn_count: 9, length_miles: 1.27 },
  // ——— Charlotte Roval & roval-style ———
  { track_name: "Charlotte Motor Speedway", config_name: "Roval", turn_count: 17, length_miles: 2.28 },
  { track_name: "Charlotte Motor Speedway", config_name: "Roval - 2018", turn_count: 17, length_miles: 2.28 },
  { track_name: "Charlotte Motor Speedway", config_name: "Roval - 2020", turn_count: 17, length_miles: 2.28 },
  { track_name: "Charlotte Motor Speedway", config_name: "Road Course", turn_count: 17, length_miles: 2.28 },
  { track_name: "Charlotte Roval", config_name: "", turn_count: 17, length_miles: 2.28 },
  { track_name: "Charlotte Roval", config_name: "Roval", turn_count: 17, length_miles: 2.28 },
  // ——— Oval ———
  { track_name: "Charlotte Motor Speedway", config_name: "Oval", turn_count: 4, length_miles: 1.5 },
  { track_name: "Charlotte Motor Speedway", config_name: "", turn_count: 4, length_miles: 1.5 },
  { track_name: "Rockingham Speedway", config_name: "Oval", turn_count: 4, length_miles: 1.017 },
  { track_name: "Rockingham Speedway", config_name: "", turn_count: 4, length_miles: 1.017 },
  { track_name: "Nashville Fairgrounds Speedway", config_name: "", turn_count: 4, length_miles: 0.596 },
  { track_name: "Daytona International Speedway", config_name: "NASCAR Oval", turn_count: 4, length_miles: 2.5 },
  { track_name: "Daytona International Speedway", config_name: "Road Course", turn_count: 12, length_miles: 3.61 },
  { track_name: "Daytona International Speedway", config_name: "Oval", turn_count: 4, length_miles: 2.5 },
  { track_name: "Indianapolis Motor Speedway", config_name: "Oval", turn_count: 4, length_miles: 2.5 },
  { track_name: "Darlington Raceway", config_name: "", turn_count: 4, length_miles: 1.366 },
  // ——— By track_id (when schedule supplies ID; add track_name for consistency if desired) ———
  { track_id: 1, config_name: "", turn_count: 8, length_miles: 1.5 },
  { track_id: 2, config_name: "", turn_count: 11, length_miles: 2.238 },
  { track_id: 3, config_name: "", turn_count: 10, length_miles: 2.0 },
  { track_id: 11, config_name: "Full", turn_count: 11, length_miles: 3.4 },
  { track_id: 13, config_name: "International", turn_count: 17, length_miles: 3.74 },
  { track_id: 82, config_name: "Grand Prix", turn_count: 14, length_miles: 1.8 },
  { track_id: 16, config_name: "Road Course", turn_count: 14, length_miles: 2.439 },
  { track_id: 34, config_name: "Grand Prix", turn_count: 18, length_miles: 3.609 },
  { track_id: 44, config_name: "", turn_count: 17, length_miles: 2.38 },
  { track_id: 47, config_name: "Full Course", turn_count: 11, length_miles: 2.238 },
];
