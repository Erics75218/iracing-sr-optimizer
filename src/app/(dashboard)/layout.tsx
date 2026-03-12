import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { getIracingId } from "@/lib/auth";
import { getAccessToken } from "@/lib/iracing-oauth";
import { getDisciplineSeriesNames } from "@/lib/discipline-series";
import { getMemberDisciplineRatings, getMemberDisplayName } from "@/lib/member-ratings";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const iracingId = await getIracingId();
  const cookieStore = await cookies();
  const accessToken = getAccessToken(cookieStore);
  const [disciplineRatings, disciplineSeriesNames, iracingName] =
    await Promise.all([
      iracingId && accessToken
        ? getMemberDisciplineRatings(iracingId, accessToken)
        : null,
      accessToken ? getDisciplineSeriesNames(accessToken) : null,
      iracingId && accessToken
        ? getMemberDisplayName(iracingId, accessToken)
        : null,
    ]);

  const isConnected = Boolean(accessToken);

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <AppSidebar
          isConnected={isConnected}
          iracingId={iracingId}
          iracingName={iracingName ?? undefined}
          disciplineRatings={disciplineRatings}
          disciplineSeriesNames={disciplineSeriesNames}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 md:px-6">
          <SidebarToggle
            isConnected={isConnected}
            iracingId={iracingId}
            iracingName={iracingName ?? undefined}
            disciplineRatings={disciplineRatings}
            disciplineSeriesNames={disciplineSeriesNames}
          />
          <span className="text-sm font-medium text-muted-foreground md:hidden">
            Menu
          </span>
          <span className="flex-1 text-center text-sm font-semibold text-foreground md:text-base">
            The Fast Panties Racing Sr Optomizer
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
