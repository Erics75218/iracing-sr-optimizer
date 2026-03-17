import { iracingDataGet } from "@/lib/iracing-api";

type CarPackages = { package_id?: number; packageId?: number; content_ids?: number[] };

type MemberInfoResponse = {
  other_owned_packages?: number[];
  track_packages?: CarPackages[];
  trackPackages?: CarPackages[];
};

/**
 * Best-effort set of package IDs that the member owns.
 * - `other_owned_packages`: additional packages owned
 * - `track_packages`: track-related packages owned
 */
export async function fetchOwnedPackageIds(token: string): Promise<Set<number>> {
  const owned = new Set<number>();
  const res = await iracingDataGet<MemberInfoResponse>("member/info", { token });
  if (!res.ok || !res.data) return owned;
  const other = Array.isArray(res.data.other_owned_packages) ? res.data.other_owned_packages : [];
  for (const id of other) if (typeof id === "number") owned.add(id);
  const trackPkgs = (res.data.track_packages ?? res.data.trackPackages) as CarPackages[] | undefined;
  if (Array.isArray(trackPkgs)) {
    for (const p of trackPkgs) {
      const id = p.package_id ?? p.packageId;
      if (typeof id === "number") owned.add(id);
    }
  }
  return owned;
}

