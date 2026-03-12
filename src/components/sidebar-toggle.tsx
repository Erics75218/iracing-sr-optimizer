"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import type { DisciplineRatings } from "@/lib/member-ratings";

export function SidebarToggle({
  isConnected,
  iracingId,
  iracingName,
  disciplineRatings,
  disciplineSeriesNames,
}: {
  isConnected?: boolean;
  iracingId?: string | null;
  iracingName?: string | null;
  disciplineRatings?: DisciplineRatings | null;
  disciplineSeriesNames?: import("@/lib/discipline-series").DisciplineSeriesNames | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-56">
        <AppSidebar
          className="border-0 h-full"
          isConnected={isConnected}
          iracingId={iracingId}
          iracingName={iracingName}
          disciplineRatings={disciplineRatings}
          disciplineSeriesNames={disciplineSeriesNames}
        />
      </SheetContent>
    </Sheet>
  );
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
