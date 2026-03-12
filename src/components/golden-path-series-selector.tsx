"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { setSavedGoldenPathIds } from "@/lib/golden-path-storage";

type SeriesItem = { series_id: number; series_name: string };

type Props = {
  /** Series for this discipline (Formula, Sports Car, etc.). */
  disciplineSeries: SeriesItem[];
  /** When null, all series are included (no golden param). When set, only these IDs are in the golden path. */
  selectedGoldenIds: number[] | null;
  /** e.g. "/dashboard/formula", "/dashboard/sports-car" */
  basePath: string;
  /** e.g. "formula", "sports-car" — used for localStorage key. */
  disciplineKey: string;
};

export function GoldenPathSeriesSelector({
  disciplineSeries,
  selectedGoldenIds,
  basePath,
  disciplineKey,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isChecked = (seriesId: number) =>
    selectedGoldenIds === null || selectedGoldenIds.includes(seriesId);

  async function handleToggle(seriesId: number, nowIncluded: boolean) {
    const allIds = disciplineSeries.map((s) => s.series_id);
    const currentIds = selectedGoldenIds ?? allIds;

    const nextIds = nowIncluded
      ? (currentIds.includes(seriesId) ? currentIds : [...currentIds, seriesId])
      : currentIds.filter((id) => id !== seriesId);

    if (nextIds.length === allIds.length) {
      setSavedGoldenPathIds(disciplineKey, []);
    } else if (nextIds.length === 0) {
      setSavedGoldenPathIds(disciplineKey, [0]);
    } else {
      setSavedGoldenPathIds(disciplineKey, nextIds);
    }

    const base = new URLSearchParams(searchParams.toString());
    base.delete("golden");
    if (nextIds.length === allIds.length) {
      // all included = no param
    } else if (nextIds.length > 0) {
      nextIds.forEach((id) => base.append("golden", String(id)));
    } else {
      base.append("golden", "0");
    }

    const q = base.toString();
    const href = q ? `${basePath}?${q}` : basePath;
    await router.push(href);
    router.refresh();
  }

  if (disciplineSeries.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Include in golden path (uncheck to omit long/slow series):
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {disciplineSeries.map((s) => (
          <li key={s.series_id} className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isChecked(s.series_id)}
                onChange={(e) => handleToggle(s.series_id, e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span>{s.series_name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
