// Typed wrappers over the aggregated Odoo API (otm.cw.api). One function = one Odoo request.
import { odooCall } from "./client";
import { cached, invalidate } from "../server/cache";
import type {
  Dashboard, JobCard, ListResult, Operations, StaticConfig, Quote, Role,
} from "../types";

type Obj = Record<string, unknown>;
const refresh = () => Number(process.env.OPERATIONS_REFRESH_INTERVAL) || 5000;

// ── config (cached) ─────────────────────────────────────────────
export const getStaticConfig = () => cached("static", 60_000, () => odooCall<StaticConfig>("static_config"));
export const dropConfigCache = () => invalidate("static");
export const refreshInterval = () => Math.min(Math.max(refresh(), 2000), 60000);

// ── live data (short TTL only to collapse concurrent pollers into one Odoo call) ──
export const getOperations = () => cached("ops", 1500, () => odooCall<Operations>("operations"));
// Any mutation drops the ops cache and nudges the notification sender (fire-and-forget; one cheap Odoo call, never awaited).
let flushing = false;
export const flushNotifications = () => {
  if (flushing) return;
  flushing = true;
  odooCall("notify_flush", {}).catch(() => null).finally(() => { flushing = false; });
};
export const dropOpsCache = () => { invalidate("ops"); flushNotifications(); };
export const getDashboard = (dateFrom?: string, dateTo?: string) =>
  cached(`dash:${dateFrom}:${dateTo}`, 5000, () => odooCall<Dashboard>("dashboard", { date_from: dateFrom, date_to: dateTo }));

// ── auth ────────────────────────────────────────────────────────
export const whoami = (uid: number) =>
  odooCall<{ ok: boolean; uid: number; name: string; role: Role; partner_id: number | false; employee_id: number | false }>(
    "whoami", { uid });

// ── generic resources ───────────────────────────────────────────
export const listRecords = (resource: string, q: Obj) => odooCall<ListResult>("list_records", { resource, ...q });
export const saveRecord = (resource: string, recordId: number | null, values: Obj, actor: string, scope?: number | null) =>
  odooCall<Obj>("save_record", { resource, record_id: recordId, values, scope_partner_id: scope ?? null }, { actor });
export const deleteRecord = (resource: string, recordId: number, actor: string) =>
  odooCall("delete_record", { resource, record_id: recordId }, { actor });

// ── pricing / settings / demo ───────────────────────────────────
export const setPricing = (cells: Obj[], actor: string) => odooCall("pricing_set", { cells }, { actor });
export const setSettings = (values: Obj) => odooCall("settings_set", { values });
export const quote = (q: Obj) => odooCall<Quote>("quote", q);
export const seedDemo = () => odooCall("seed_demo", {}, { model: "otm.cw.seed" });
export const clearDemo = () => odooCall("clear_demo", {}, { model: "otm.cw.seed" });
export const demoLoaded = () => odooCall<boolean>("demo_loaded", {}, { model: "otm.cw.seed" });

// ── walk-in & jobs ──────────────────────────────────────────────
export const lookup = (regNo?: string, mobile?: string) => odooCall<Obj>("lookup", { reg_no: regNo, mobile });
export const walkIn = (v: Obj, actor: string) => odooCall<JobCard>("walkin", v, { actor });
export const jobDetail = (jobId: number, scope?: number | null) =>
  odooCall<JobCard>("job_detail", { job_id: jobId, scope_partner_id: scope ?? null });
export const jobAction = (jobId: number, action: string, params: Obj, actor: string) =>
  odooCall<JobCard>("job_action", { job_id: jobId, action, params }, { actor });
export const saveInspection = (jobId: number, kind: string, values: Obj, actor: string) =>
  odooCall<JobCard>("inspection_save", { job_id: jobId, kind, values }, { actor });
export const inspectionPhoto = (id: number, side: string, scope?: number | null) =>
  odooCall<{ data: string }>("inspection_photo", { inspection_id: id, side, scope_partner_id: scope ?? null });

// ── bookings / packages / feedback ──────────────────────────────
export const createBooking = (v: Obj, actor: string) => odooCall<Obj>("booking_create", v, { actor });
export const bookingAction = (id: number, action: string, actor: string, scope?: number | null, reason?: string) =>
  odooCall<Obj>("booking_action", { booking_id: id, action, scope_partner_id: scope ?? null, reason }, { actor });
export const sellPackage = (v: Obj, actor: string) => odooCall<Obj>("package_sell", v, { actor });
export const addFeedback = (v: Obj, actor: string) => odooCall("feedback_add", v, { actor });

// ── aggregated summaries ────────────────────────────────────────
export const customerSummary = (id: number) => odooCall<Obj>("customer_summary", { partner_id: id });
export const vehicleSummary = (id: number) => odooCall<Obj>("vehicle_summary", { vehicle_id: id });
export const searchAll = (q: string) => odooCall<Obj>("search_all", { q });
export const staffPerformance = (from?: string, to?: string) => odooCall<Obj[]>("staff_performance", { date_from: from, date_to: to });
export const staffSummary = (id: number, from?: string, to?: string) =>
  odooCall<Obj>("staff_summary", { employee_id: id, date_from: from, date_to: to });
export const reports = (from?: string, to?: string) => cached(`rep:${from}:${to}`, 10_000, () => odooCall<Obj>("reports", { date_from: from, date_to: to }));

// ── portal ──────────────────────────────────────────────────────
export const portalHome = (partnerId: number) => odooCall<Obj>("portal_home", { partner_id: partnerId });
export const portalInvoices = (partnerId: number, offset: number, limit: number) =>
  odooCall<Obj>("portal_invoices", { partner_id: partnerId, offset, limit });
export const portalProfile = (partnerId: number, values: Obj) => odooCall("portal_profile_save", { partner_id: partnerId, values });

// ── customer notifications ──────────────────────────────────────
export const notifySettings = () => odooCall<Obj>("notify_settings_get");
export const saveNotifySettings = (values: Obj) => odooCall<Obj>("notify_settings_set", { values });
export const notifyTest = (channel: string, to: string) => odooCall("notify_test", { channel, to });
export const notifyJob = (jobId: number, event: string, channels: string[] | undefined, actor: string) =>
  odooCall<Obj>("notify_job", { job_id: jobId, event, channels: channels ?? null }, { actor });
export const jobNotifications = (jobId: number) => odooCall<Obj[]>("job_notifications", { job_id: jobId });
export const notifyResend = (id: number) => odooCall("notify_resend", { notification_id: id });
export const telegramLinkCode = (partnerId: number) => odooCall<{ link: string; bot: string; linked: boolean }>("telegram_link_code", { partner_id: partnerId });
export const telegramLink = (code: string, chatId: number | string) => odooCall<{ ok: boolean }>("telegram_link", { code, chat_id: chatId });
export const telegramUnlink = (partnerId: number) => odooCall("telegram_unlink", { partner_id: partnerId });
export const telegramSetWebhook = (url: string, secret: string) => odooCall("telegram_set_webhook", { url, secret });
