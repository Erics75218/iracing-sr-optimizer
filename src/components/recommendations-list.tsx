import { formatDisplayWeek } from "@/lib/format-week";
import type { RaceRecommendation } from "@/lib/iracing-types";

type Props = {
  recommendations: RaceRecommendation[];
  /** When true, show a note that this is mock data until API is connected */
  isMock?: boolean;
};

export function RecommendationsList({ recommendations, isMock }: Props) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recommendations right now. Connect to iRacing and ensure you have schedule data.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {isMock && (
        <p className="text-xs text-muted-foreground">
          Showing sample recommendations. Connect to iRacing for live schedule data.
        </p>
      )}
      <ul className="space-y-2">
        {recommendations.map((r) => (
          <li
            key={`${r.seriesName}-${r.trackName}-${r.raceWeek}`}
            className="flex flex-col gap-1.5 rounded-md border bg-card px-3 py-2 text-sm"
          >
            <span className="font-medium">
              {r.seriesName} — Week {formatDisplayWeek(r.raceWeek)}
            </span>
            <div className="text-muted-foreground">
              {r.trackName}
              {r.trackConfig ? ` (${r.trackConfig})` : ""}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {(r.potentialCorners != null && r.potentialCorners > 0) && (
                <span title="Total corners in the race if 0 incidents">
                  Total corners: {r.potentialCorners}
                </span>
              )}
              {(r.cornersPerMile != null && r.cornersPerMile > 0) && (
                <span title="Track corners per mile">
                  Corners/mi: {r.cornersPerMile.toFixed(1)}
                </span>
              )}
              <span title="Average incidents per race (from stats when available)">
                Avg incidents: {r.avgIncidentsPerRace != null ? r.avgIncidentsPerRace.toFixed(1) : "—"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{r.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
