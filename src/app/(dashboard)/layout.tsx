import { AppSidebar } from "@/components/app-sidebar";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { getIracingId } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const iracingId = await getIracingId();
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <AppSidebar iracingId={iracingId} />
      </div>
      <div className="flex flex-1 flex-col">
        <header className=" sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 md:px-6">
          <SidebarToggle iracingId={iracingId} />
          <span className="text-sm font-medium text-muted-foreground md:hidden">
            Menu
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
