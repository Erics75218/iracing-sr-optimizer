"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DisciplineRatings } from "@/lib/member-ratings";

type LicenseKey = keyof DisciplineRatings;

export function ProfileLicenseStrip({
  licenses,
  selectedKey,
  licenseKeys,
}: {
  licenses: DisciplineRatings | null;
  selectedKey: LicenseKey;
  licenseKeys: Array<{ key: LicenseKey; label: string }>;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {licenseKeys.map(({ key, label }) => {
        const r = licenses?.[key];
        const isSelected = selectedKey === key;
        const href = `${pathname}?license=${key}`;

        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary/15 ring-2 ring-primary/40 text-primary dark:bg-primary/20 dark:ring-primary/50"
                : "border-border bg-card hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="block">{label}</span>
            {r?.license_class != null && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {r.license_class}
                {r.irating != null && ` · iR ${r.irating}`}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
