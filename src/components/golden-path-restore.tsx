"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSavedGoldenPathIds, setSavedGoldenPathIds } from "@/lib/golden-path-storage";

type Props = {
  /** e.g. "/dashboard/formula", "/dashboard/sports-car" */
  basePath: string;
  /** e.g. "formula", "sports-car" — used for localStorage key. */
  disciplineKey: string;
};

/**
 * Restores Golden Path series selection from localStorage when the discipline page
 * is opened without golden params. Syncs URL → localStorage when the URL has golden params.
 * Must run in client; wrap in <Suspense> if used in a page that uses useSearchParams.
 */
export function GoldenPathRestore({ basePath, disciplineKey }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRestored = useRef(false);

  useEffect(() => {
    if (!searchParams) return;
    const goldenList = searchParams.getAll("golden");

    if (goldenList.length > 0) {
      const ids = goldenList
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n));
      setSavedGoldenPathIds(disciplineKey, ids);
      return;
    }

    if (hasRestored.current) return;
    const saved = getSavedGoldenPathIds(disciplineKey);
    if (saved.length === 0) return;
    hasRestored.current = true;
    const base = new URLSearchParams(searchParams.toString());
    base.delete("golden");
    saved.forEach((id) => base.append("golden", String(id)));
    const q = base.toString();
    router.replace(q ? `${basePath}?${q}` : basePath);
  }, [router, searchParams, basePath, disciplineKey]);

  return null;
}
