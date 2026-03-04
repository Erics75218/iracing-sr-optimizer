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
        {recommendations.map((r, i) => (
          <li
            key={`${r.seriesName}-${r.trackName}-${r.raceWeek}`}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
          >
            <span className="font-medium">
              {r.seriesName} — Week {r.raceWeek}
            </span>
            <span className="text-muted-foreground">
              {r.trackName}
              {r.trackConfig ? ` (${r.trackConfig})` : ""}
            </span>
            <span className="text-xs text-muted-foreground">{r.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
