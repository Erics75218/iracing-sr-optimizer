"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LICENSE_CLASSES = [
  { name: "Formula", href: "/dashboard/formula" },
  { name: "Sports Car", href: "/dashboard/sports-car" },
  { name: "Oval", href: "/dashboard/oval" },
  { name: "Dirt Oval", href: "/dashboard/dirt-oval" },
  { name: "Dirt Road", href: "/dashboard/dirt-road" },
] as const;

export function AppSidebar({
  className,
  iracingId,
}: {
  className?: string;
  iracingId?: string | null;
}) {
  const pathname = usePathname();

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
          className="mb-4 px-3 py-2 text-sm font-semibold text-foreground hover:text-primary"
        >
          iRacing SR Optimizer
        </Link>
        {iracingId && (
          <p className="mb-2 px-3 py-1 text-xs text-muted-foreground">
            ID: {iracingId}
          </p>
        )}
        {LICENSE_CLASSES.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              {item.name}
            </Button>
          </Link>
        ))}
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
