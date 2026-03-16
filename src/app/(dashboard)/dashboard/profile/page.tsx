import { getIracingId } from "@/lib/auth";
import { getAccessToken } from "@/lib/iracing-oauth";
import { getMemberDisciplineRatings, getMemberDisplayName } from "@/lib/member-ratings";
import type { CategoryRatings, DisciplineRatings } from "@/lib/member-ratings";
import { ProfileLicenseStrip } from "@/components/profile-license-strip";
import { ProfileStatsCharts } from "@/components/profile-stats-charts";

const LICENSE_KEYS: Array<{ key: keyof DisciplineRatings; label: string }> = [
  { key: "formula", label: "Formula" },
  { key: "sportsCar", label: "Sports Car" },
  { key: "oval", label: "Oval" },
  { key: "dirtOval", label: "Dirt Oval" },
  { key: "dirtRoad", label: "Dirt Road" },
];

type Props = { searchParams: Promise<{ license?: string }> };

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: Props) {
  const iracingId = await getIracingId();
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const accessToken = getAccessToken(cookieStore);

  const [ratings, displayName] = await Promise.all([
    iracingId && accessToken ? getMemberDisciplineRatings(iracingId, accessToken) : null,
    iracingId && accessToken ? getMemberDisplayName(iracingId, accessToken) : null,
  ]);

  const params = await searchParams;
  const licenseParam = params.license ?? "formula";
  const selectedKey = LICENSE_KEYS.some((l) => l.key === licenseParam)
    ? (licenseParam as keyof DisciplineRatings)
    : "formula";
  const selectedRatings: CategoryRatings | null = ratings ? ratings[selectedKey] : null;

  if (!accessToken || !iracingId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground">
          Connect to iRacing and enter your iRacing ID to see your licenses and stats.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="mt-1 text-lg text-muted-foreground">
          {displayName ?? "iRacing Member"} · ID {iracingId}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Licenses</h2>
        <ProfileLicenseStrip
          licenses={ratings}
          selectedKey={selectedKey}
          licenseKeys={LICENSE_KEYS}
        />
      </section>

      {selectedRatings && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {LICENSE_KEYS.find((l) => l.key === selectedKey)?.label} — Statistics
          </h2>
          <ProfileStatsCharts ratings={selectedRatings} />
        </section>
      )}
    </div>
  );
}
