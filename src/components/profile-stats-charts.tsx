"use client";

import type { CategoryRatings } from "@/lib/member-ratings";

/** iRacing Safety Rating break points. */
const SR_BREAKS = [
  { value: 1, label: "Demotion", description: "Below 1.0: lose license at season end" },
  { value: 2, label: "Safe", description: "2.0+: no change at season end" },
  { value: 3, label: "Season promo", description: "3.0+: eligible for promotion at season end" },
  { value: 4, label: "Fast track", description: "4.0+: instant promotion if MPR met" },
] as const;

const IRATING_MIN = 500;
const IRATING_MAX = 5000;
const SR_MAX = 5;

/** Vertical line positions for iRating: 1000, 2000, 3000, 4000 */
const IRATING_LINES = [1000, 2000, 3000, 4000];

function safeNum(n: number | null): number {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

export function ProfileStatsCharts({ ratings }: { ratings: CategoryRatings }) {
  const irating = safeNum(ratings.irating);
  const sr = safeNum(ratings.safety_rating);
  const iratingPct = Math.min(100, Math.max(0, ((irating - IRATING_MIN) / (IRATING_MAX - IRATING_MIN)) * 100));
  const srPct = Math.min(100, (sr / SR_MAX) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">License class</p>
          <p className="text-lg font-semibold">{ratings.license_class ?? "—"}</p>
        </div>
        <div className="rounded border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">iRating</p>
          <p className="text-lg font-semibold">{ratings.irating != null ? ratings.irating.toLocaleString() : "—"}</p>
        </div>
        <div className="rounded border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Safety Rating</p>
          <p className="text-lg font-semibold">{ratings.safety_rating != null ? ratings.safety_rating.toFixed(2) : "—"}</p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">iRating</p>
        <div className="flex items-center gap-3">
          <div className="relative h-8 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-blue-600 dark:bg-blue-500"
              style={{ width: `${iratingPct}%` }}
            />
            {IRATING_LINES.map((line) => {
              const x = ((line - IRATING_MIN) / (IRATING_MAX - IRATING_MIN)) * 100;
              return (
                <div
                  key={line}
                  className="absolute top-0 z-10 h-full w-0.5 bg-foreground/40"
                  style={{ left: `${x}%` }}
                  title={`${line.toLocaleString()}`}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium tabular-nums">
            {irating.toLocaleString()} <span className="text-muted-foreground">/ {IRATING_MAX}</span>
          </span>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Safety Rating</p>
        <div className="flex items-center gap-3">
          <div className="relative h-10 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-emerald-600 dark:bg-emerald-500"
              style={{ width: `${srPct}%` }}
            />
            {SR_BREAKS.map(({ value }) => {
              const x = (value / SR_MAX) * 100;
              return (
                <div
                  key={value}
                  className="absolute top-0 z-10 h-full w-0.5 bg-foreground/50"
                  style={{ left: `${x}%` }}
                  title={`${value}.0`}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium tabular-nums">
            {sr.toFixed(2)} <span className="text-muted-foreground">/ {SR_MAX}</span>
          </span>
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SR_BREAKS.map(({ value, label, description }) => (
            <li key={value} title={description}>
              <span className="font-medium text-foreground">{value}.0</span> {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
