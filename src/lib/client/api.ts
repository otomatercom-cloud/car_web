// Browser-side fetch wrapper. Talks ONLY to this app's own /api routes (never to Odoo).
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const GENERIC = "Something went wrong. Please try again.";

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection.", 0);
  }
  let json: { data?: T; error?: string } = {};
  try {
    json = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (res.status === 401 && typeof window !== "undefined" && !url.includes("auth/")) {
    window.location.href = "/login";
  }
  if (!res.ok) throw new ApiError(json.error || GENERIC, res.status);
  return json.data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body: unknown = {}) => request<T>("POST", url, body),
  put: <T>(url: string, body: unknown = {}) => request<T>("PUT", url, body),
  del: <T>(url: string) => request<T>("DELETE", url),
};

export function qs(params: Record<string, string | number | undefined | null | Record<string, string | number | undefined>>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object") {
      for (const [fk, fv] of Object.entries(v)) if (fv !== undefined && fv !== "") u.set(`f.${fk}`, String(fv));
    } else u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}
