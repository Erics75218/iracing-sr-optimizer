import { cookies } from "next/headers";

const COOKIE_NAME = "iracing_id";

/**
 * Reads the stored iRacing ID from the cookie (server-side only).
 */
export async function getIracingId(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  return cookie?.value?.trim() ?? null;
}
