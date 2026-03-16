import { cookies } from "next/headers";
import { getAccessToken } from "@/lib/iracing-oauth";
import { iracingDataGet } from "@/lib/iracing-api";
import { fetchCurrentSeasonSchedule } from "@/lib/fetch-schedule";
import { fetchIracingTracks } from "@/lib/fetch-tracks";
import { getEffectiveTrackIndex } from "@/lib/missing-tracks";
import { getMergedTrackIndex, getTrackLayout } from "@/data/track-layouts";
import { MOCK_SEASON } from "@/lib/mock-schedule";
import {
  getSeriesByCategory,
  findSeriesByName,
  getSeriesCurrentWeekSession,
} from "@/lib/discipline-schedule";
import { getSectionRecommendations } from "@/lib/get-section-recommendations";
import { getGoldenPath } from "@/lib/golden-path";
import { buildGetAvgLapTimeMs } from "@/lib/fetch-series-avg-lap";
import { formatDisplayWeek } from "@/lib/format-week";
import { GoldenPathRestore } from "@/components/golden-path-restore";
import { GoldenPathSeriesSelector } from "@/components/golden-path-series-selector";
import { DisciplineScheduleSection } from "@/components/discipline-schedule-section";
import { Suspense } from "react";

const DIRT_ROAD_OPTIONS = { categoryId: 4 as const, limit: 20 };

type Props = { searchParams: Promise<{ series?: string; golden?: string | string[] }> };

export default async function DirtRoadPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const accessToken = getAccessToken(cookieStore);
  const apiTest = accessToken
    ? await iracingDataGet("constants/divisions", { token: accessToken })
    : { ok: false as const, status: 401, error: "Not connected" };
  const hasLiveData = apiTest.ok;

  const [season, tracksResult] = await Promise.all([
    accessToken ? fetchCurrentSeasonSchedule(accessToken) : Promise.resolve(null),
    accessToken ? fetchIracingTracks(accessToken) : Promise.resolve({ ok: false as const, status: 401, error: "No token" }),
  ]);
  const effectiveSeason = season ?? MOCK_SEASON;
  const dirtRoadSeries = getSeriesByCategory(effectiveSeason, 4);
  const isMock = !season;
  const merged = getMergedTrackIndex(tracksResult.ok && tracksResult.entries.length > 0 ? tracksResult.entries : []);
  const trackIndexEntries = getEffectiveTrackIndex(effectiveSeason, merged);

  const params = await searchParams;
  const seriesFilter = params.series?.trim();
  const selectedSeries = seriesFilter
    ? findSeriesByName(effectiveSeason, seriesFilter)
    : null;
  const currentWeekSession = selectedSeries
    ? getSeriesCurrentWeekSession(selectedSeries)
    : null;
  const seriesNotFound = Boolean(seriesFilter && !selectedSeries);

  const rawGolden = params.golden;
  const goldenIds: number[] | null =
    rawGolden == null
      ? null
      : (Array.isArray(rawGolden) ? rawGolden : [rawGolden])
          .map((s) => parseInt(String(s), 10))
          .filter((n) => !Number.isNaN(n));
  const seriesForGoldenPath =
    goldenIds == null || goldenIds.length === 0
      ? dirtRoadSeries ?? []
      : (dirtRoadSeries ?? []).filter((s) => goldenIds.includes(s.series_id));
  const selectedGoldenIds =
    goldenIds != null && goldenIds.length > 0 ? goldenIds : null;

  const { avgLapTimeMap } = await getSectionRecommendations(accessToken ?? null, {
    ...DIRT_ROAD_OPTIONS,
    ...(seriesFilter ? { seriesName: seriesFilter } : {}),
    season,
  });
  const getAvgLapTimeMs = buildGetAvgLapTimeMs(avgLapTimeMap);

  let goldenPath: Awaited<ReturnType<typeof getGoldenPath>> = [];
  try {
    goldenPath = getGoldenPath(
      seriesForGoldenPath,
      (id, config, name) => getTrackLayout(id, config, name, trackIndexEntries),
      getAvgLapTimeMs ?? undefined
    );
  } catch {
    goldenPath = [];
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <GoldenPathRestore basePath="/dashboard/dirt-road" disciplineKey="dirt-road" />
      </Suspense>
      <h1 className="text-2xl font-semibold">
        Dirt Road
        {selectedSeries ? `: ${selectedSeries.series_name}` : seriesFilter ? `: ${seriesFilter}` : ""}
      </h1>
      <p className="text-muted-foreground">
        {seriesNotFound
          ? `Series "${seriesFilter}" not found in schedule. Select one below.`
          : selectedSeries
            ? `Current week track and schedule for ${selectedSeries.series_name}.`
            : "Select a Dirt Road series for this week's track and schedule below."}
      </p>

      {!selectedSeries && (dirtRoadSeries?.length ?? 0) > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <h2 className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Golden path — best race per week for SR (0 incidents)
          </h2>
          {isMock && (
            <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">
              Using fallback schedule — only sample series are shown. Connect to iRacing for the full list.
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            One race per week that gives the highest potential corners in Dirt Road. Run these for maximum SR gain with 0×. Uncheck series you want to omit (e.g. very long races). Click a series below to see its schedule and track data instead.
          </p>
          <GoldenPathSeriesSelector
            disciplineSeries={dirtRoadSeries ?? []}
            selectedGoldenIds={selectedGoldenIds}
            basePath="/dashboard/dirt-road"
            disciplineKey="dirt-road"
          />
          {goldenPath.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Week</th>
                    <th className="pb-2 pr-4">Series</th>
                    <th className="pb-2 pr-4">Track</th>
                    <th className="pb-2 pr-4 text-right">Corners</th>
                    <th className="pb-2 text-right">Corners/mi</th>
                  </tr>
                </thead>
                <tbody>
                  {goldenPath.map((row) => (
                    <tr key={row.race_week_num} className="border-b border-amber-200/50 last:border-0 dark:border-amber-900/50">
                      <td className="py-2 pr-4 font-medium tabular-nums">{formatDisplayWeek(row.race_week_num)}</td>
                      <td className="py-2 pr-4">{row.series_name}</td>
                      <td className="py-2 pr-4">
                        {row.track_name}
                        {row.track_config ? ` (${row.track_config})` : ""}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{row.potentialCorners}</td>
                      <td className="py-2 text-right tabular-nums">
                        {row.cornersPerMile != null ? row.cornersPerMile.toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {goldenPath.length === 0 && seriesForGoldenPath.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No races with corner data in the selected series. Include more series above or add track data.
            </p>
          )}
          {goldenPath.length === 0 && seriesForGoldenPath.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No series selected. Check at least one series above to build the golden path.
            </p>
          )}
        </section>
      )}

      <DisciplineScheduleSection
        disciplineLabel="Dirt Road"
        basePath="/dashboard/dirt-road"
        disciplineSeries={dirtRoadSeries}
        selectedSeries={selectedSeries}
        currentWeekSession={currentWeekSession}
        seriesNotFound={seriesNotFound}
        hasLiveData={hasLiveData}
        isMock={isMock}
        trackIndexEntries={trackIndexEntries}
      />
    </div>
  );
}
