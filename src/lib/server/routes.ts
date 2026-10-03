// The complete HTTP API surface of the Next.js server. Every handler = ONE aggregated Odoo call
// (or a short Promise.all when two independent calls are genuinely needed).
import { z } from "zod";
import { route, type Ctx } from "./router";
import { odooAuthenticate, OdooError, GENERIC_ERROR } from "../odoo/client";
import * as o from "../odoo/services";
import { rateLimit } from "./rate-limit";
import { startSession, endSession } from "./session";
import {
  bookingActionSchema, bookingSchema, feedbackSchema, inspectionSchema, jobActionSchema, loginSchema,
  packageSellSchema, paymentSchema, pricingSchema, profileSchema, quoteSchema, resourceValuesSchema,
  settingsSchema, walkInSchema,
  notifySettingsSchema, notifyTestSchema, notifyJobSchema,
} from "../schemas";
import { JOB_ACTIONS, type Role } from "../rbac";

const M: Role[] = ["manager"];
const MR: Role[] = ["manager", "reception"];
const MRO: Role[] = ["manager", "reception", "operator"];
const ALL: Role[] = ["manager", "reception", "operator", "customer"];
const C: Role[] = ["customer"];

const num = (v: string | null | undefined, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const idParam = (c: Ctx) => {
  const n = Number(c.params.id);
  if (!Number.isInteger(n) || n <= 0) throw new OdooError("Not found.", 422);
  return n;
};
const partner = (c: Ctx) => {
  if (!c.session.partnerId) throw new OdooError("Your account is not linked to a customer profile.", 422);
  return c.session.partnerId;
};
const employee = (c: Ctx) => {
  if (!c.session.employeeId) throw new OdooError("Your login is not linked to a staff record. Ask your manager.", 422);
  return c.session.employeeId;
};

// ── generic resource access matrix ──────────────────────────────
const RES: Record<string, { read: Role[]; write: Role[]; del?: boolean }> = {
  vehicle_types: { read: ALL, write: M, del: true },
  services: { read: ALL, write: M, del: true },
  vehicles: { read: MRO, write: MR, del: true },
  customers: { read: MR, write: MR },
  notifications: { read: MR, write: [] },
  bays: { read: MRO, write: M, del: true },
  staff: { read: MRO, write: M },
  packages: { read: ALL, write: M, del: true },
  bookings: { read: MR, write: [] },
  jobs: { read: MRO, write: [] },
  payments: { read: MR, write: [] },
  subscriptions: { read: MR, write: [] },
  audit: { read: M, write: [] },
};
const PORTAL_RES = new Set(["vehicles", "bookings", "jobs", "payments", "subscriptions"]);
const MASTER = new Set(["vehicle_types", "services", "bays", "staff", "packages"]);

const listArgs = (q: URLSearchParams) => {
  const filters: Record<string, string> = {};
  q.forEach((v, k) => {
    if (k.startsWith("f.")) filters[k.slice(2)] = v;
  });
  return {
    search: (q.get("search") || "").slice(0, 80),
    offset: num(q.get("offset")),
    limit: Math.min(num(q.get("limit"), 25), 100),
    filters,
    date_from: q.get("date_from") || undefined,
    date_to: q.get("date_to") || undefined,
  };
};

async function guardJob(c: Ctx, jobId: number, action?: string) {
  if (c.session.role !== "operator") return;
  const emp = employee(c);
  const job = await o.jobDetail(jobId);
  const crew = [...job.assigned_staff, ...(job.actual_staff ?? [])];
  // Nobody pinned or working yet -> any operator may take the job by starting it; otherwise only its crew.
  const mine = crew.length === 0 ? action === "start" : crew.some((s) => s.id === emp);
  if (!mine) throw new OdooError("This job is assigned to another bay operator.", 422);
}

export const routes = [
  // ── auth (public) ─────────────────────────────────────────────
  route({
    method: "POST", path: "auth/login", roles: "public", body: loginSchema,
    handler: async (c) => {
      const ip = c.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      if (!rateLimit(`login:${ip}`, 20, 15 * 60_000) || !rateLimit(`login:${ip}:${c.body.login}`, 6, 5 * 60_000)) {
        throw new OdooError("Too many attempts. Try again in a few minutes.", 422);
      }
      const uid = await odooAuthenticate(c.body.login, c.body.password);
      if (!uid) throw new OdooError("Invalid login or password.", 422);
      const who = await o.whoami(uid);
      if (!who.ok) throw new OdooError("This account does not have Car Wash access.", 422);
      await startSession({
        uid: who.uid, name: who.name, role: who.role,
        partnerId: who.partner_id || null, employeeId: who.employee_id || null,
      });
      return { role: who.role, name: who.name };
    },
  }),
  route({ method: "POST", path: "auth/logout", roles: "public", handler: async () => { await endSession(); return { ok: true }; } }),
  route({ method: "GET", path: "auth/me", roles: ALL, handler: (c) => c.session }),

  // ── cached reference data ─────────────────────────────────────
  route({
    method: "GET", path: "static", roles: ALL,
    handler: async (c) => {
      const cfg = await o.getStaticConfig();
      const base = { ...cfg, refreshMs: o.refreshInterval() };
      return c.session.role === "customer" ? { ...base, staff: [], bays: [], settings: {} } : base;
    },
  }),

  // ── aggregated operational endpoints ──────────────────────────
  route({
    method: "GET", path: "operations", roles: MRO,
    handler: async () => ({ ...(await o.getOperations()), refreshMs: o.refreshInterval() }),
  }),
  route({
    method: "GET", path: "dashboard", roles: M,
    handler: (c) => o.getDashboard(c.query.get("date_from") || undefined, c.query.get("date_to") || undefined),
  }),
  route({ method: "GET", path: "customer/:id/summary", roles: MR, handler: (c) => o.customerSummary(idParam(c)) }),
  route({ method: "GET", path: "vehicles/:id/summary", roles: MR, handler: (c) => o.vehicleSummary(idParam(c)) }),
  route({
    method: "GET", path: "staff/:id/performance", roles: MRO,
    handler: (c) => {
      const id = idParam(c);
      if (c.session.role === "operator" && id !== c.session.employeeId) throw new OdooError("You can only view your own performance.", 422);
      return o.staffSummary(id, c.query.get("date_from") || undefined, c.query.get("date_to") || undefined);
    },
  }),
  route({
    method: "GET", path: "staff-performance", roles: M,
    handler: (c) => o.staffPerformance(c.query.get("date_from") || undefined, c.query.get("date_to") || undefined),
  }),
  route({
    method: "GET", path: "reports", roles: M,
    handler: (c) => o.reports(c.query.get("date_from") || undefined, c.query.get("date_to") || undefined),
  }),
  route({ method: "GET", path: "search", roles: MR, handler: (c) => o.searchAll((c.query.get("q") || "").slice(0, 40)) }),
  route({
    method: "GET", path: "lookup", roles: MR,
    handler: (c) => o.lookup(c.query.get("reg") || undefined, c.query.get("mobile") || undefined),
  }),
  route({
    method: "POST", path: "quote", roles: MR, body: quoteSchema,
    handler: (c) => o.quote({ partner_id: c.body.partnerId, vehicle_type_id: c.body.vehicleTypeId, service_ids: c.body.serviceIds }),
  }),

  // ── walk-in & job cards ───────────────────────────────────────
  route({
    method: "POST", path: "walk-in", roles: MR, body: walkInSchema,
    handler: async (c) => {
      const b = c.body;
      const job = await o.walkIn({
        name: b.name, mobile: b.mobile, reg_no: b.regNo, vehicle_type_id: b.vehicleTypeId, service_ids: b.serviceIds,
        brand: b.brand, model: b.model, color: b.color, priority: b.priority, subscription_id: b.subscriptionId, notes: b.notes, notify_opt_in: b.notifyOptIn,
      }, c.actor);
      o.dropOpsCache();
      return job;
    },
  }),
  route({ method: "GET", path: "jobs/:id", roles: MRO, handler: (c) => o.jobDetail(idParam(c)) }),
  route({
    method: "POST", path: "jobs/:id/action", roles: MRO, body: jobActionSchema,
    handler: async (c) => {
      const id = idParam(c);
      const { action, params } = c.body;
      if (!JOB_ACTIONS[c.session.role].includes(action)) throw new OdooError("You do not have permission for this action.", 422);
      await guardJob(c, id, action);
      const p: Record<string, unknown> = { ...params };
      if (action === "start" && c.session.role === "operator" && !params.employee_ids?.length) p.employee_ids = [employee(c)];
      const out = await o.jobAction(id, action, p, c.actor);
      o.dropOpsCache();
      return out;
    },
  }),
  route({
    method: "POST", path: "jobs/:id/payment", roles: MR, body: paymentSchema,
    handler: async (c) => {
      const out = await o.jobAction(idParam(c), "payment", c.body, c.actor);
      o.dropOpsCache();
      return out;
    },
  }),
  route({
    method: "POST", path: "jobs/:id/inspection", roles: MRO, body: inspectionSchema, maxBodyKb: 20_000,
    handler: async (c) => {
      const id = idParam(c);
      await guardJob(c, id, "start");
      const { kind, ...values } = c.body;
      return o.saveInspection(id, kind, values, c.actor);
    },
  }),
  route({
    method: "GET", path: "jobs/:id/photo/:insp/:side", roles: MRO,
    handler: async (c) => {
      const side = c.params.side;
      if (!["front", "rear", "left", "right"].includes(side)) throw new OdooError("Not found.", 422);
      const { data } = await o.inspectionPhoto(Number(c.params.insp), side);
      if (!data) return new Response("Not found", { status: 404 });
      return new Response(Buffer.from(data, "base64"), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
    },
  }),
  route({
    method: "GET", path: "my/jobs", roles: ["operator"],
    handler: async (c) => ({ ...(await o.staffSummary(employee(c))), employeeId: c.session.employeeId, server_now: new Date().toISOString() }),
  }),

  // ── customer notifications ────────────────────────────────────
  route({ method: "GET", path: "notify/settings", roles: M, handler: () => o.notifySettings() }),
  route({
    method: "POST", path: "notify/settings", roles: M, body: notifySettingsSchema,
    handler: async (c) => { const out = await o.saveNotifySettings(c.body); o.dropConfigCache(); return out; },
  }),
  route({ method: "POST", path: "notify/test", roles: M, body: notifyTestSchema, handler: (c) => o.notifyTest(c.body.channel, c.body.to) }),
  route({
    method: "POST", path: "notify/telegram-webhook", roles: M,
    handler: () => {
      const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
      if (!base.startsWith("https://")) throw new OdooError("Set NEXT_PUBLIC_APP_URL to your public https address first (Telegram only calls https webhooks).", 422);
      if (secret.length < 16) throw new OdooError("Set TELEGRAM_WEBHOOK_SECRET (16+ characters) in the server environment first.", 422);
      return o.telegramSetWebhook(`${base}/api/telegram/webhook`, secret);
    },
  }),
  // Called by Telegram's servers (no cookie): authenticated by the secret header, never by session.
  route({
    method: "POST", path: "telegram/webhook", roles: "public",
    handler: async (c) => {
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
      if (secret.length < 16 || c.req.headers.get("x-telegram-bot-api-secret-token") !== secret) throw new OdooError("Not allowed.", 403);
      const upd = (await c.req.json().catch(() => ({}))) as { message?: { text?: string; chat?: { id?: number; type?: string } } };
      const text = upd.message?.text ?? "";
      const chat = upd.message?.chat;
      const m = /^\/start\s+([A-Za-z0-9]{6,40})$/.exec(text.trim());
      if (m && chat?.id && chat.type === "private") await o.telegramLink(m[1], chat.id);
      return { ok: true };
    },
  }),
  route({ method: "GET", path: "jobs/:id/notifications", roles: MR, handler: (c) => o.jobNotifications(idParam(c)) }),
  route({
    method: "POST", path: "jobs/:id/notify", roles: MR, body: notifyJobSchema,
    handler: async (c) => { const out = await o.notifyJob(idParam(c), c.body.event, c.body.channels, c.actor); o.flushNotifications(); return out; },
  }),
  route({ method: "POST", path: "notifications/:id/resend", roles: MR, handler: (c) => o.notifyResend(idParam(c)) }),
  route({
    method: "POST", path: "customer/:id/telegram-unlink", roles: MR,
    handler: async (c) => { await o.telegramUnlink(idParam(c)); return { ok: true }; },
  }),
  route({ method: "POST", path: "portal/telegram-link", roles: C, handler: (c) => o.telegramLinkCode(partner(c)) }),

  // ── bookings & packages ───────────────────────────────────────
  route({
    method: "POST", path: "bookings", roles: MR, body: bookingSchema,
    handler: async (c) => {
      const v = c.body;
      if (!v.partnerId) throw new OdooError("Select a customer.", 422);
      return o.createBooking({ partner_id: v.partnerId, vehicle_id: v.vehicleId, service_ids: v.serviceIds, slot: v.slot, notes: v.notes, source: "reception" }, c.actor);
    },
  }),
  route({
    method: "POST", path: "bookings/:id/action", roles: MR, body: bookingActionSchema,
    handler: async (c) => {
      const out = await o.bookingAction(idParam(c), c.body.action, c.actor, null, c.body.reason);
      o.dropOpsCache();
      return out;
    },
  }),
  route({
    method: "POST", path: "packages/sell", roles: MR, body: packageSellSchema,
    handler: (c) => o.sellPackage({ partner_id: c.body.partnerId, package_id: c.body.packageId, method: c.body.method }, c.actor),
  }),

  // ── pricing / settings / demo (manager) ───────────────────────
  route({
    method: "POST", path: "pricing", roles: M, body: pricingSchema,
    handler: async (c) => {
      await o.setPricing(c.body.cells, c.actor);
      o.dropConfigCache();
      return { ok: true };
    },
  }),
  route({
    method: "GET", path: "settings", roles: M,
    handler: async () => {
      const [cfg, demo] = await Promise.all([o.getStaticConfig(), o.demoLoaded()]);
      return { settings: cfg.settings, demo, refreshMs: o.refreshInterval() };
    },
  }),
  route({
    method: "POST", path: "settings", roles: M, body: settingsSchema,
    handler: async (c) => {
      await o.setSettings(c.body);
      o.dropConfigCache();
      o.dropOpsCache();
      return { ok: true };
    },
  }),
  route({
    method: "POST", path: "demo", roles: M, body: z.object({ action: z.enum(["seed", "clear"]) }),
    handler: async (c) => {
      const out = c.body.action === "seed" ? await o.seedDemo() : await o.clearDemo();
      o.dropConfigCache();
      o.dropOpsCache();
      return out;
    },
  }),

  // ── generic master/list resources ─────────────────────────────
  route({
    method: "GET", path: "r/:resource", roles: MRO,
    handler: async (c) => {
      const rule = RES[c.params.resource];
      if (!rule || !rule.read.includes(c.session.role)) throw new OdooError("You do not have access to this.", 422);
      return o.listRecords(c.params.resource, listArgs(c.query));
    },
  }),
  route({
    method: "POST", path: "r/:resource", roles: MR, body: z.object({ values: resourceValuesSchema }),
    handler: async (c) => {
      const rule = RES[c.params.resource];
      if (!rule || !rule.write.includes(c.session.role)) throw new OdooError("You do not have permission for this.", 422);
      const out = await o.saveRecord(c.params.resource, null, c.body.values, c.actor);
      if (MASTER.has(c.params.resource)) o.dropConfigCache();
      o.dropOpsCache();
      return out;
    },
  }),
  route({
    method: "PUT", path: "r/:resource/:id", roles: MR, body: z.object({ values: resourceValuesSchema }),
    handler: async (c) => {
      const rule = RES[c.params.resource];
      if (!rule || !rule.write.includes(c.session.role)) throw new OdooError("You do not have permission for this.", 422);
      const out = await o.saveRecord(c.params.resource, idParam(c), c.body.values, c.actor);
      if (MASTER.has(c.params.resource)) o.dropConfigCache();
      o.dropOpsCache();
      return out;
    },
  }),
  route({
    method: "DELETE", path: "r/:resource/:id", roles: MR,
    handler: async (c) => {
      const rule = RES[c.params.resource];
      if (!rule?.del || !rule.write.includes(c.session.role)) throw new OdooError("You do not have permission for this.", 422);
      await o.deleteRecord(c.params.resource, idParam(c), c.actor);
      o.dropConfigCache();
      o.dropOpsCache();
      return { ok: true };
    },
  }),

  // ── customer portal (customer id ALWAYS comes from the signed session) ──
  route({ method: "GET", path: "portal/home", roles: C, handler: (c) => o.portalHome(partner(c)) }),
  route({
    method: "GET", path: "portal/r/:resource", roles: C,
    handler: (c) => {
      if (!PORTAL_RES.has(c.params.resource)) throw new OdooError("Not found.", 422);
      return o.listRecords(c.params.resource, { ...listArgs(c.query), scope_partner_id: partner(c) });
    },
  }),
  route({
    method: "POST", path: "portal/vehicles", roles: C, body: z.object({ values: resourceValuesSchema }),
    handler: (c) => o.saveRecord("vehicles", null, c.body.values, c.actor, partner(c)),
  }),
  route({
    method: "POST", path: "portal/quote", roles: C, body: quoteSchema,
    handler: (c) => o.quote({ partner_id: partner(c), vehicle_type_id: c.body.vehicleTypeId, service_ids: c.body.serviceIds }),
  }),
  route({
    method: "POST", path: "portal/bookings", roles: C, body: bookingSchema,
    handler: (c) =>
      o.createBooking({ partner_id: partner(c), vehicle_id: c.body.vehicleId, service_ids: c.body.serviceIds, slot: c.body.slot, notes: c.body.notes, source: "portal" }, c.actor),
  }),
  route({
    method: "POST", path: "portal/bookings/:id/cancel", roles: C,
    handler: (c) => o.bookingAction(idParam(c), "cancel", c.actor, partner(c), "Cancelled by customer"),
  }),
  route({ method: "GET", path: "portal/jobs/:id", roles: C, handler: (c) => o.jobDetail(idParam(c), partner(c)) }),
  route({
    method: "GET", path: "portal/invoices", roles: C,
    handler: (c) => o.portalInvoices(partner(c), num(c.query.get("offset")), Math.min(num(c.query.get("limit"), 25), 100)),
  }),
  route({
    method: "POST", path: "portal/profile", roles: C, body: profileSchema,
    handler: async (c) => {
      await o.portalProfile(partner(c), c.body);
      return { ok: true };
    },
  }),
  route({
    method: "POST", path: "portal/feedback", roles: C, body: feedbackSchema,
    handler: (c) => o.addFeedback({ job_id: c.body.jobId, rating: c.body.rating, comment: c.body.comment, scope_partner_id: partner(c) }, c.actor),
  }),
];

export { GENERIC_ERROR };
