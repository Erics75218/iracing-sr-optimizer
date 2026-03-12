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

/** License object from member/info (each category uses this shape). */
type LicenseInfo = {
  irating?: number;
  safety_rating?: number;
  group_name?: string;
  license_level?: number;
  [key: string]: unknown;
};

type MemberInfoLicenses = {
  formula_car?: LicenseInfo;
  sports_car?: LicenseInfo;
  oval?: LicenseInfo;
  dirt_oval?: LicenseInfo;
  dirt_road?: LicenseInfo;
};

type MemberInfoResponse = {
  licenses?: MemberInfoLicenses;
  display_name?: string;
  first_name?: string;
  last_name?: string;
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
  const safety_rating =
    typeof lic.safety_rating === "number"
      ? lic.safety_rating
      : typeof lic.safety_rating === "string"
        ? parseFloat(lic.safety_rating)
        : null;
  const license_class =
    typeof lic.group_name === "string" && lic.group_name.trim()
      ? lic.group_name.trim()
      : typeof lic.license_level === "number" && LICENSE_LEVEL_NAMES[lic.license_level] != null
        ? LICENSE_LEVEL_NAMES[lic.license_level]
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

  return {
    formula: toRatings(licenses.formula_car),
    sportsCar: toRatings(licenses.sports_car),
    oval: toRatings(licenses.oval),
    dirtOval: toRatings(licenses.dirt_oval),
    dirtRoad: toRatings(licenses.dirt_road),
  };
}

/** Best-effort display name for the authenticated member from member/info (for sidebar). */
export async function getMemberDisplayName(
  _custId: string,
  token: string | null
): Promise<string | null> {
  if (!token) return null;
  const result = await iracingDataGet<MemberInfoResponse>("member/info", { token });
  if (!result.ok || !result.data) return null;
  const data = result.data;
  if (typeof data.display_name === "string" && data.display_name.trim()) {
    return data.display_name.trim();
  }
  const first =
    typeof data.first_name === "string" && data.first_name.trim()
      ? data.first_name.trim()
      : "";
  const last =
    typeof data.last_name === "string" && data.last_name.trim()
      ? data.last_name.trim()
      : "";
  const joined = `${first} ${last}`.trim();
  return joined || null;
}
