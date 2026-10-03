// In-memory sliding-window limiter (single instance). For multi-instance deployments
// swap this for Redis; the call sites stay the same.
const g = globalThis as unknown as { __cwRate?: Map<string, number[]> };
const hits = (g.__cwRate ??= new Map<string, number[]>());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
