"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSavedGoldenQueryString } from "@/lib/golden-path-storage";
import type { DisciplineRatings } from "@/lib/member-ratings";

function RatingBadge({
  license_class,
  irating,
  safety_rating,
}: {
  license_class: string | null;
  irating: number | null;
  safety_rating: number | null;
}) {
  const hasAny = license_class != null || irating != null || safety_rating != null;
  if (!hasAny) return null;
  return (
    <span className="block w-full text-[10px] font-normal tabular-nums text-muted-foreground">
      {license_class != null && (
        <span title="License class" className="font-medium text-foreground/90">
          {license_class}
        </span>
      )}
      {license_class != null && (irating != null || safety_rating != null) && " · "}
      {irating != null && <span title="iRating">iR {irating}</span>}
      {irating != null && safety_rating != null && " · "}
      {safety_rating != null && (
        <span title="Safety Rating">SR {safety_rating.toFixed(2)}</span>
      )}
    </span>
  );
}

type Props = {
  isOnPage: boolean;
  disciplineRatings: DisciplineRatings | null;
};

export function FormulaNavLink({ isOnPage, disciplineRatings }: Props) {
  const pathname = usePathname();
  const [href, setHref] = useState("/dashboard/formula");

  useEffect(() => {
    setHref("/dashboard/formula" + getSavedGoldenQueryString("formula"));
  }, [pathname]);

  return (
    <Link href={href} className="flex-1 min-w-0">
      <Button
        variant={isOnPage ? "secondary" : "ghost"}
        className="h-auto min-h-10 w-full flex-col items-start gap-0.5 whitespace-normal py-2.5 px-3 text-left"
      >
        <span className="w-full text-sm font-medium text-foreground">Formula</span>
        {disciplineRatings && (
          <RatingBadge
            license_class={disciplineRatings.formula.license_class}
            irating={disciplineRatings.formula.irating}
            safety_rating={disciplineRatings.formula.safety_rating}
          />
        )}
      </Button>
    </Link>
  );
}
