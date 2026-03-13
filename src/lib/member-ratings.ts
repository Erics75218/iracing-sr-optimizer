/**
 * Fetch iRacing member's iRating and Safety Rating per discipline from member/info.
 * The member/info endpoint returns the authenticated user's licenses (formula_car, oval, etc.)
 * each with irating and safety_rating.
 */

import { iracingDataGet } from "@/lib/iracing-api";

export type CategoryRatings = {
  irating: number | null;
  safety_rating: number | null;
  /** License class, e.g. "Class A", "Rookie" */
  license_class: string | null;
};

/** Ratings keyed by our sidebar order: Formula, Sports Car, Oval, Dirt Oval, Dirt Road. */
export type DisciplineRatings = {
  formula: CategoryRatings;
  sportsCar: CategoryRatings;
  oval: CategoryRatings;
  dirtOval: CategoryRatings;
  dirtRoad: CategoryRatings;
};

/** License object from member/info (each category uses this shape). API may return snake_case or camelCase. */
type LicenseInfo = {
  irating?: number;
  safety_rating?: number;
  group_name?: string;
  groupName?: string;
  license_level?: number;
  licenseLevel?: number;
  [key: string]: unknown;
};

type MemberInfoLicenses = {
  formula_car?: LicenseInfo;
  formulaCar?: LicenseInfo;
  sports_car?: LicenseInfo;
  sportsCar?: LicenseInfo;
  oval?: LicenseInfo;
  dirt_oval?: LicenseInfo;
  dirtOval?: LicenseInfo;
  dirt_road?: LicenseInfo;
  dirtRoad?: LicenseInfo;
  [key: string]: unknown;
};

type MemberInfoResponse = {
  licenses?: MemberInfoLicenses;
  display_name?: string;
  displayName?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  [key: string]: unknown;
};

/** Short label for license level when group_name is missing (0=Rookie, 1=D, 2=C, 3=B, 4=A). */
const LICENSE_LEVEL_NAMES: Record<number, string> = {
  0: "Rookie",
  1: "D",
  2: "C",
  3: "B",
  4: "A",
};

function toRatings(lic?: LicenseInfo): CategoryRatings {
  if (!lic || typeof lic !== "object") {
    return { irating: null, safety_rating: null, license_class: null };
  }
  const irating =
    typeof lic.irating === "number" ? lic.irating : null;
  const safetyVal = lic.safety_rating ?? (lic as Record<string, unknown>).safetyRating;
  const safety_rating =
    typeof safetyVal === "number"
      ? safetyVal
      : typeof safetyVal === "string"
        ? parseFloat(safetyVal)
        : null;
  const groupName = lic.group_name ?? (lic as Record<string, unknown>).groupName;
  const licenseLevel = lic.license_level ?? (lic as Record<string, unknown>).licenseLevel;
  const license_class =
    typeof groupName === "string" && groupName.trim()
      ? groupName.trim()
      : typeof licenseLevel === "number" && LICENSE_LEVEL_NAMES[licenseLevel] != null
        ? LICENSE_LEVEL_NAMES[licenseLevel]
        : null;
  return {
    irating: irating != null && !Number.isNaN(irating) ? irating : null,
    safety_rating:
      safety_rating != null && !Number.isNaN(safety_rating) ? safety_rating : null,
    license_class,
  };
}

/**
 * Get iRating and Safety Rating for the authenticated member from member/info (licenses).
 * Returns null if not connected or API fails.
 */
export async function getMemberDisciplineRatings(
  _custId: string,
  token: string | null
): Promise<DisciplineRatings | null> {
  if (!token) return null;

  const result = await iracingDataGet<MemberInfoResponse>("member/info", { token });
  if (!result.ok || !result.data) return null;

  const licenses = result.data.licenses;
  if (!licenses || typeof licenses !== "object") {
    return {
      formula: { irating: null, safety_rating: null, license_class: null },
      sportsCar: { irating: null, safety_rating: null, license_class: null },
      oval: { irating: null, safety_rating: null, license_class: null },
      dirtOval: { irating: null, safety_rating: null, license_class: null },
      dirtRoad: { irating: null, safety_rating: null, license_class: null },
    };
  }

  const getLic = (snake: keyof MemberInfoLicenses, camel: keyof MemberInfoLicenses): LicenseInfo | undefined =>
    (licenses[snake] as LicenseInfo | undefined) ?? (licenses[camel] as LicenseInfo | undefined);
  return {
    formula: toRatings(getLic("formula_car", "formulaCar")),
    sportsCar: toRatings(getLic("sports_car", "sportsCar")),
    oval: toRatings(licenses.oval),
    dirtOval: toRatings(getLic("dirt_oval", "dirtOval")),
    dirtRoad: toRatings(getLic("dirt_road", "dirtRoad")),
  };
}

/** Best-effort display name for the authenticated member from member/info (for sidebar). Handles snake_case and camelCase. */
export async function getMemberDisplayName(
  _custId: string,
  token: string | null
): Promise<string | null> {
  if (!token) return null;
  const result = await iracingDataGet<MemberInfoResponse>("member/info", { token });
  if (!result.ok || !result.data) return null;
  const data = result.data as Record<string, unknown>;
  const displayName =
    (typeof data.display_name === "string" && data.display_name.trim()
      ? data.display_name.trim()
      : null) ??
    (typeof data.displayName === "string" && data.displayName.trim()
      ? (data.displayName as string).trim()
      : null);
  if (displayName) return displayName;
  const first =
    (typeof data.first_name === "string" && data.first_name.trim()
      ? data.first_name.trim()
      : "") ||
    (typeof data.firstName === "string" && (data.firstName as string).trim()
      ? (data.firstName as string).trim()
      : "");
  const last =
    (typeof data.last_name === "string" && data.last_name.trim()
      ? data.last_name.trim()
      : "") ||
    (typeof data.lastName === "string" && (data.lastName as string).trim()
      ? (data.lastName as string).trim()
      : "");
  const joined = `${first} ${last}`.trim();
  return joined || null;
}
