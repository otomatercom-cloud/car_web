// Tiny TTL cache with in-flight de-duplication. Used for:
//  - static config (services, vehicle types, pricing, bays, staff)  -> 60s
//  - /operations fan-out protection: N browsers polling => 1 Odoo call per ~1.5s
interface Entry { exp: number; val?: unknown; pending?: Promise<unknown> }
const g = globalThis as unknown as { __cwCache?: Map<string, Entry> };
const store = (g.__cwCache ??= new Map<string, Entry>());

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now && hit.val !== undefined) return hit.val as T;
  if (hit?.pending) return hit.pending as Promise<T>;
  const pending = fn()
    .then((val) => {
      store.set(key, { exp: Date.now() + ttlMs, val });
      return val;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });
  store.set(key, { exp: 0, pending });
  return pending;
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

if (store.size > 500) store.clear();
