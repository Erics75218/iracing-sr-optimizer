/**
 * Types for iRacing Data API responses. Aligned with members-ng.iracing.com/data
 * so we can plug in real API data once OAuth is approved.
 */

/** Category id: 1=oval, 2=road, 3=dirt oval, 4=dirt road */
export type CategoryId = 1 | 2 | 3 | 4;

export type Track = {
  track_id: number;
  track_name: string;
  config_name: string | null;
  /** Approx lap count for typical race; used for SR scoring when no corner data */
  lap_count?: number;
};

export type Session = {
  session_id?: number;
  race_week_num: number;
  track: Track;
  /** Session length (e.g. "30 min" or "20 laps") - raw from API */
  session_name?: string;
  /** Duration in minutes when available */
  duration_minutes?: number;
};

export type Series = {
  series_id: number;
  series_name: string;
  category_id: CategoryId;
  sessions?: Session[];
};

export type Season = {
  season_id: number;
  season_year: number;
  season_quarter: number;
  series?: Series[];
};

/** Flattened "race" we recommend: one session in a series for a given week */
export type RaceRecommendation = {
  seriesName: string;
  trackName: string;
  trackConfig: string | null;
  raceWeek: number;
  /** Higher = better for SR (e.g. longer race, fewer corners) */
  score: number;
  reason: string;
  categoryId: CategoryId;
};
