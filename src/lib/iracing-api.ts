/**
 * iRacing Data API client (members-ng.iracing.com/data).
 * Many endpoints return { link: "https://..." }; we fetch that URL to get the actual data.
 * Public endpoints (e.g. constants, car, carclass) may work without auth.
 * Member-specific data requires OAuth2 (to be added later).
 */

const BASE_URL = "https://members-ng.iracing.com/data";

export type IracingApiError = {
  ok: false;
  status: number;
  error: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Accept": "application/json",
      ...init?.headers,
    },
    // iRacing API can be slow; allow longer timeout for server-side use
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iRacing API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Call an iRacing Data API path (e.g. "constants/divisions" or "car/get").
 * If the response has a "link" field, fetches that URL and returns the JSON.
 * Otherwise returns the response body (e.g. { data: ... }).
 * Optional searchParams are appended (e.g. { cust_ids: "123" }).
 */
export async function iracingDataGet<T = unknown>(
  path: string,
  options?: { token?: string; searchParams?: Record<string, string> }
): Promise<{ ok: true; data: T } | IracingApiError> {
  const pathPart = path.replace(/^\//, "");
  const sp = options?.searchParams;
  const query = sp && Object.keys(sp).length > 0
    ? "?" + new URLSearchParams(sp).toString()
    : "";
  const url = `${BASE_URL}/${pathPart}${query}`;
  const headers: Record<string, string> = {};
  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  try {
    const raw = await fetchJson<{ link?: string; data?: T }>(url, { headers });
    if (typeof (raw as { link?: string }).link === "string") {
      const linkUrl = (raw as { link: string }).link;
      const linkHeaders: Record<string, string> = {};
      if (options?.token) linkHeaders["Authorization"] = `Bearer ${options.token}`;
      const data = await fetchJson<T>(linkUrl, { headers: linkHeaders });
      return { ok: true, data };
    }
    if (Object.prototype.hasOwnProperty.call(raw, "data")) {
      return { ok: true, data: (raw as { data: T }).data };
    }
    return { ok: true, data: raw as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith("iRacing API ")
      ? parseInt(message.replace(/^iRacing API (\d+).*/, "$1"), 10) || 500
      : 500;
    return {
      ok: false,
      status: Number.isNaN(status) ? 500 : status,
      error: message,
    };
  }
}

/** License / category IDs used in the app (match sidebar). */
export const LICENSE_CATEGORY_IDS: Record<string, number> = {
  oval: 1,
  road: 2,
  dirt_oval: 3,
  dirt_road: 4,
} as const;
