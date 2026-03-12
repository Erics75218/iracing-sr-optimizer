import { cookies } from "next/headers";

export const IRACING_ID_COOKIE = "iracing_id";
const COOKIE_NAME = IRACING_ID_COOKIE;
export const IRACING_ID_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
};

/**
 * Reads the stored iRacing ID from the cookie (server-side only).
 */
export async function getIracingId(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  return cookie?.value?.trim() ?? null;
}
