import Link from "next/link";
import { formatDisplayWeek } from "@/lib/format-week";
import { getTurnsPerMile, turnsPerMileFromTrack } from "@/data/track-layouts";
import type { IracingTrackIndexEntry } from "@/data/iracing-track-index";
import type { Series, Session } from "@/lib/iracing-types";

type Props = {
  disciplineLabel: string;
  basePath: string;
  disciplineSeries: Series[];
  selectedSeries: Series | null;
  currentWeekSession: Session | null;
  seriesNotFound: boolean;
  hasLiveData: boolean;
  isMock: boolean;
  /** When connected, API + static merged track index for full coverage (turns per mile). */
  trackIndexEntries?: IracingTrackIndexEntry[];
};

export function DisciplineScheduleSection({
  disciplineLabel,
  basePath,
  disciplineSeries,
  selectedSeries,
  currentWeekSession,
  seriesNotFound,
  hasLiveData,
  isMock,
  trackIndexEntries,
}: Props) {
  const showList = !selectedSeries || seriesNotFound;

  return (
    <section
      className={`rounded-lg border p-4 ${hasLiveData && !isMock ? "bg-primary/5 dark:bg-primary/10 border-primary/20" : "bg-card"}`}
    >
      <h2 className="text-sm font-medium">
        {selectedSeries ? "This week" : `${disciplineLabel} series`}
      </h2>
      {hasLiveData && !isMock && (
        <p className="mt-1 text-xs text-muted-foreground">Live schedule</p>
      )}
      {!hasLiveData && (
        <p className="mt-1 text-xs text-muted-foreground">
          <Link href="/dashboard" className="underline hover:no-underline">
            Connect to iRacing
          </Link>{" "}
          for live series and schedule.
        </p>
      )}

      {showList && (
        <ul className="mt-3 space-y-1">
          {disciplineSeries.length === 0 && !seriesNotFound ? (
            <li className="text-sm text-muted-foreground">
              No {disciplineLabel} series in this schedule. Try the{" "}
              <Link href="/dashboard" className="underline hover:no-underline">
                Dashboard
              </Link>{" "}
              or connect to iRacing for live data.
            </li>
          ) : disciplineSeries.length > 0 ? (
            disciplineSeries.map((s) => (
              <li key={`${s.series_id}-${s.series_name}`}>
                <Link
                  href={`${basePath}?series=${encodeURIComponent(s.series_name)}`}
                  className="block rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {s.series_name}
                </Link>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">
              No {disciplineLabel} series in this schedule.
            </li>
          )}
        </ul>
      )}

      {selectedSeries && !seriesNotFound && (
        <div className="mt-3 space-y-4">
          {currentWeekSession ? (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Week {formatDisplayWeek(currentWeekSession.race_week_num)}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {currentWeekSession.track.track_name}
                {currentWeekSession.track.config_name
                  ? ` — ${currentWeekSession.track.config_name}`
                  : ""}
              </p>
              {currentWeekSession.duration_minutes != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Race length: {currentWeekSession.duration_minutes} min
                </p>
              )}
              {(() => {
                const t = currentWeekSession.track;
                const tpm =
                  turnsPerMileFromTrack(t) ??
                  getTurnsPerMile(t.track_id, t.config_name, t.track_name, trackIndexEntries);
                return tpm != null ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Turns per mile: {tpm.toFixed(1)}
                  </p>
                ) : null;
              })()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No session data for this series.
            </p>
          )}
          {selectedSeries.sessions && selectedSeries.sessions.length > 1 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">
                Full schedule
              </h3>
              <ul className="mt-2 space-y-1">
                {selectedSeries.sessions.map((sess) => {
                  const t = sess.track;
                  const tpm =
                    turnsPerMileFromTrack(t) ??
                    getTurnsPerMile(t.track_id, t.config_name, t.track_name, trackIndexEntries);
                  return (
                    <li
                      key={sess.race_week_num}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded px-2 py-1.5 text-sm"
                    >
                      <span className="font-medium">
                        Week {formatDisplayWeek(sess.race_week_num)}
                      </span>
                      <span className="text-muted-foreground">
                        {sess.track.track_name}
                        {sess.track.config_name
                          ? ` (${sess.track.config_name})`
                          : ""}
                        {tpm != null && (
                          <span className="ml-1.5 text-xs">
                            · {tpm.toFixed(1)} turns/mi
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
