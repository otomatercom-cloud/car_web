// The ONLY place that talks to Odoo. Server-side only: never import from a client component.
// Uses Odoo 19's JSON-2 API: POST {ODOO_URL}/json/2/{model}/{method} with a bearer API key.
const cfg = () => ({
  url: (process.env.ODOO_URL || "").replace(/\/+$/, ""),
  db: process.env.ODOO_DB || "",
  key: process.env.ODOO_API_KEY || "",
  timeout: Number(process.env.ODOO_TIMEOUT) || 20000,
});

export class OdooError extends Error {
  constructor(
    public userMessage: string,
    public status = 502,
    public technical?: string,
  ) {
    super(userMessage);
  }
}

export const GENERIC_ERROR = "Something went wrong. Please try again.";
// Odoo exceptions whose message is written for end users (business rules we raise ourselves).
const FRIENDLY = /(UserError|ValidationError|AccessError)$/;

function configured() {
  const c = cfg();
  if (!c.url || !c.db || !c.key) {
    console.error("[odoo] ODOO_URL / ODOO_DB / ODOO_API_KEY are not configured");
    throw new OdooError(GENERIC_ERROR, 503, "not configured");
  }
  return c;
}

export async function odooCall<T = unknown>(
  method: string,
  kwargs: Record<string, unknown> = {},
  opts: { actor?: string; model?: string } = {},
): Promise<T> {
  const c = configured();
  const model = opts.model ?? "otm.cw.api";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeout);
  try {
    const res = await fetch(`${c.url}/json/2/${model}/${method}`, {
      method: "POST",
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        Authorization: `bearer ${c.key}`,
        "X-Odoo-Database": c.db,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ ...kwargs, context: opts.actor ? { cw_actor: opts.actor } : {} }),
    });
    if (res.ok) return (await res.json()) as T;
    let body: { name?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON error page */
    }
    console.error(`[odoo] ${model}.${method} -> ${res.status} ${body.name ?? ""} ${body.message ?? ""}`);
    if (res.status < 500 && body.name && FRIENDLY.test(body.name) && body.message) {
      throw new OdooError(body.message, 422, body.name);
    }
    if (body.name && FRIENDLY.test(body.name) && body.message) throw new OdooError(body.message, 422, body.name);
    throw new OdooError(GENERIC_ERROR, 502, `${res.status} ${body.name ?? ""}`);
  } catch (err) {
    if (err instanceof OdooError) throw err;
    console.error(`[odoo] ${model}.${method} failed:`, (err as Error).message);
    throw new OdooError(GENERIC_ERROR, 502, (err as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

/** Verify a user's Odoo password. The Odoo session cookie is discarded; we issue our own. */
export async function odooAuthenticate(login: string, password: string): Promise<number | null> {
  const c = configured();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeout);
  try {
    const res = await fetch(`${c.url}/web/session/authenticate`, {
      method: "POST",
      cache: "no-store",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { db: c.db, login, password } }),
    });
    const json = (await res.json()) as { result?: { uid?: number | false } };
    return json.result?.uid || null;
  } catch (err) {
    console.error("[odoo] authenticate failed:", (err as Error).message);
    throw new OdooError(GENERIC_ERROR, 502);
  } finally {
    clearTimeout(timer);
  }
}
