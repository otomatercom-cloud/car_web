// Small route engine behind app/api/[...slug]/route.ts.
// Every request: origin check (CSRF) -> session -> role -> rate limit -> zod body -> handler.
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { OdooError, GENERIC_ERROR } from "../odoo/client";
import { readSession, type Session } from "./session";
import { rateLimit } from "./rate-limit";
import type { Role } from "../rbac";

export interface Ctx<B = any> {
  session: Session;
  params: Record<string, string>;
  query: URLSearchParams;
  body: B;
  req: NextRequest;
  actor: string;
}

export interface Route<S extends ZodTypeAny = ZodTypeAny> {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string; // e.g. "customer/:id/summary"
  roles: Role[] | "public";
  body?: S;
  maxBodyKb?: number;
  handler: (c: Ctx<z.infer<S>>) => Promise<unknown> | unknown;
}

export const route = <S extends ZodTypeAny = ZodTypeAny>(r: Route<S>) => r as unknown as Route;

function match(pattern: string, segs: string[]): Record<string, string> | null {
  const parts = pattern.split("/");
  if (parts.length !== segs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(":")) params[parts[i].slice(1)] = decodeURIComponent(segs[i]);
    else if (parts[i] !== segs[i]) return null;
  }
  return params;
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return req.headers.get("sec-fetch-site") !== "cross-site";
}

const json = (data: unknown, status = 200) => NextResponse.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

export async function dispatch(req: NextRequest, slug: string[], routes: Route[]): Promise<Response> {
  const method = req.method as Route["method"];
  let found: { r: Route; params: Record<string, string> } | null = null;
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = match(r.path, slug);
    if (params) {
      found = { r, params };
      break;
    }
  }
  if (!found) return fail("Not found.", 404);
  const { r, params } = found;

  try {
    if (method !== "GET" && !sameOrigin(req)) return fail("Request blocked.", 403);

    let session: Session | null = null;
    if (r.roles !== "public") {
      session = await readSession();
      if (!session) return fail("Please sign in again.", 401);
      if (!r.roles.includes(session.role)) return fail("You do not have access to this.", 403);
      if (method !== "GET" && !rateLimit(`mut:${session.uid}`, 240, 60_000)) return fail("Too many requests. Please slow down.", 429);
    }

    let body: unknown = undefined;
    if (method === "POST" || method === "PUT") {
      const len = Number(req.headers.get("content-length") || 0);
      if (len > (r.maxBodyKb ?? 64) * 1024) return fail("The request is too large.", 413);
      const text = await req.text();
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        return fail("Invalid request.", 400);
      }
      if (r.body) body = r.body.parse(body);
    }

    const result = await r.handler({
      session: session as Session,
      params,
      query: req.nextUrl.searchParams,
      body,
      req,
      actor: session?.name ?? "",
    });
    return result instanceof Response ? result : json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return fail(err.issues[0]?.message || "Please check the entered values.", 400);
    }
    if (err instanceof OdooError) return fail(err.userMessage, err.status === 422 ? 422 : err.status === 401 ? 401 : 502);
    console.error("[api] unhandled", slug.join("/"), err);
    return fail(GENERIC_ERROR, 500);
  }
}
