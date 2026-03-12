"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormulaNavLink } from "@/components/formula-nav-link";
import type { DisciplineRatings } from "@/lib/member-ratings";
import type { DisciplineSeriesNames } from "@/lib/discipline-series";

const LICENSE_CLASSES: Array<{
  name: string;
  href: string;
  ratingKey: keyof DisciplineRatings;
  expandableKey: keyof DisciplineSeriesNames;
}> = [
  { name: "Formula", href: "/dashboard/formula", ratingKey: "formula", expandableKey: "formula" },
  { name: "Sports Car", href: "/dashboard/sports-car", ratingKey: "sportsCar", expandableKey: "sportsCar" },
  { name: "Oval", href: "/dashboard/oval", ratingKey: "oval", expandableKey: "oval" },
  { name: "Dirt Oval", href: "/dashboard/dirt-oval", ratingKey: "dirtOval", expandableKey: "dirtOval" },
  { name: "Dirt Road", href: "/dashboard/dirt-road", ratingKey: "dirtRoad", expandableKey: "dirtRoad" },
];

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

export function AppSidebar({
  className,
  isConnected = false,
  iracingId,
  iracingName,
  disciplineRatings,
  disciplineSeriesNames,
}: {
  className?: string;
  isConnected?: boolean;
  iracingId?: string | null;
  iracingName?: string | null;
  disciplineRatings?: DisciplineRatings | null;
  disciplineSeriesNames?: DisciplineSeriesNames | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSeriesName = searchParams.get("series") ?? null;
  const [expandedDiscipline, setExpandedDiscipline] = useState<keyof DisciplineSeriesNames | null>(() => {
    if (pathname.startsWith("/dashboard/formula")) return "formula";
    if (pathname.startsWith("/dashboard/sports-car")) return "sportsCar";
    if (pathname.startsWith("/dashboard/oval")) return "oval";
    if (pathname.startsWith("/dashboard/dirt-oval")) return "dirtOval";
    if (pathname.startsWith("/dashboard/dirt-road")) return "dirtRoad";
    return null;
  });

  useEffect(() => {
    if (pathname.startsWith("/dashboard/formula")) setExpandedDiscipline("formula");
    else if (pathname.startsWith("/dashboard/sports-car")) setExpandedDiscipline("sportsCar");
    else if (pathname.startsWith("/dashboard/oval")) setExpandedDiscipline("oval");
    else if (pathname.startsWith("/dashboard/dirt-oval")) setExpandedDiscipline("dirtOval");
    else if (pathname.startsWith("/dashboard/dirt-road")) setExpandedDiscipline("dirtRoad");
  }, [pathname]);

  return (
    <aside
      className={cn(
        "flex w-56 flex-col border-r bg-card p-4",
        className
      )}
    >
      <nav className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="mb-2 px-3 py-2 text-sm font-semibold text-foreground hover:text-primary"
        >
          iRacing SR Optimizer
        </Link>
        <div
          className={cn(
            "mb-4 rounded-md px-3 py-2",
            isConnected
              ? "bg-green-100 dark:bg-green-950/50"
              : "bg-red-100 dark:bg-red-950/50"
          )}
        >
          {isConnected ? (
            <Link href="/api/auth/iracing/disconnect" className="block">
              <Button
                variant="secondary"
                size="sm"
                className="w-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
              >
                Connected · Disconnect
              </Button>
            </Link>
          ) : (
            <Link href="/api/auth/iracing/authorize" className="block">
              <Button
                variant="secondary"
                size="sm"
                className="w-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
              >
                Connect to iRacing
              </Button>
            </Link>
          )}
        </div>
        {iracingName && (
          <p className="mb-0.5 px-3 py-0.5 text-xs font-medium text-foreground truncate">
            {iracingName}
          </p>
        )}
        {iracingId && (
          <p className="mb-2 px-3 py-0.5 text-xs text-muted-foreground">
            ID: {iracingId}
          </p>
        )}
        {LICENSE_CLASSES.map((item) => {
          const isExpanded = expandedDiscipline === item.expandableKey;
          const isOnPage = pathname === item.href || pathname.startsWith(item.href + "?") || pathname.startsWith(item.href + "/");
          const seriesList = disciplineSeriesNames?.[item.expandableKey] ?? [];

          return (
            <div key={item.href} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-0.5">
                {item.expandableKey === "formula" ? (
                  <FormulaNavLink
                    isOnPage={isOnPage}
                    disciplineRatings={disciplineRatings}
                  />
                ) : (
                  <Link href={item.href} className="flex-1 min-w-0">
                    <Button
                      variant={isOnPage ? "secondary" : "ghost"}
                      className="h-auto min-h-10 w-full flex-col items-start gap-0.5 whitespace-normal py-2.5 px-3 text-left"
                    >
                      <span className="w-full text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      {disciplineRatings && (
                        <RatingBadge
                          license_class={disciplineRatings[item.ratingKey].license_class}
                          irating={disciplineRatings[item.ratingKey].irating}
                          safety_rating={disciplineRatings[item.ratingKey].safety_rating}
                        />
                      )}
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setExpandedDiscipline((d) => (d === item.expandableKey ? null : item.expandableKey))}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? `Collapse ${item.name} series` : `Expand ${item.name} series`}
                >
                  <ChevronIcon className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                </Button>
              </div>
              {isExpanded && (
                <ul className="ml-3 flex flex-col gap-0.5 border-l-2 border-muted pl-2">
                  {seriesList.length > 0 ? (
                    seriesList.map((seriesName) => {
                      const isSelected =
                        selectedSeriesName != null &&
                        decodeURIComponent(selectedSeriesName).trim() === seriesName.trim();
                      return (
                        <li key={seriesName}>
                          <Link
                            href={`${item.href}?series=${encodeURIComponent(seriesName)}`}
                            className={cn(
                              "block rounded px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground",
                              isSelected
                                ? "bg-primary/15 font-medium text-foreground ring-1 ring-primary/30 dark:bg-primary/20 dark:ring-primary/40"
                                : "text-muted-foreground"
                            )}
                          >
                            {seriesName}
                          </Link>
                        </li>
                      );
                    })
                  ) : disciplineSeriesNames ? (
                    <li className="px-2 py-1.5 text-xs text-muted-foreground">
                      No {item.name} series in schedule
                    </li>
                  ) : (
                    <li className="px-2 py-1.5 text-xs text-muted-foreground">
                      Connect to iRacing for series list
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
        {iracingId && (
          <Link href="/api/auth/logout" className="mt-4">
            <Button variant="outline" size="sm" className="w-full">
              Sign out
            </Button>
          </Link>
        )}
      </nav>
    </aside>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
