"use client";

import type { BestLapRow } from "@/lib/fetch-member-best-laps";

function formatLap(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const sec = ms / 1000;
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3);
  return m > 0 ? `${m}:${s.padStart(6, "0")}` : `${s}s`;
}

export function ProfileBestLapsTable({
  rows,
  licenseLabel,
}: {
  rows: BestLapRow[];
  licenseLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No best-lap-by-car data for {licenseLabel} yet. Data comes from stats/member_bests or, if empty, from your recent race results and lap data.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Track</th>
            <th className="px-3 py-2 text-left font-medium">Car</th>
            <th className="px-3 py-2 text-right font-medium">Best lap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2">{row.track_name}</td>
              <td className="px-3 py-2">{row.car_name}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatLap(row.best_lap_ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
