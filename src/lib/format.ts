import { format, formatDistanceToNowStrict } from "date-fns";
import type { JobCard } from "./types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
export const money = (n: number | null | undefined, decimals = false) => (decimals ? inr2 : inr).format(n || 0);

const d = (iso?: string | null) => (iso ? new Date(iso) : null);
export const fmtTime = (iso?: string | null) => (iso ? format(new Date(iso), "hh:mm a") : "—");
export const fmtDate = (iso?: string | null) => (iso ? format(new Date(iso), "dd MMM yyyy") : "—");
export const fmtDateTime = (iso?: string | null) => (iso ? format(new Date(iso), "dd MMM, hh:mm a") : "—");
export const ago = (iso?: string | null) => (iso ? formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) : "—");

export const mins = (m: number | null | undefined) => {
  const v = Math.round(m || 0);
  return v >= 60 ? `${Math.floor(v / 60)}h ${v % 60}m` : `${v} min`;
};

export const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

/** Seconds of wash time so far. `skewMs` = serverNow - clientNow, so wrong device clocks don't matter. */
export function elapsedSeconds(job: Pick<JobCard, "work_seconds" | "last_resume_dt" | "state">, skewMs = 0, now = Date.now()) {
  const running = job.state === "washing" && job.last_resume_dt;
  const extra = running ? Math.max(0, (now + skewMs - d(job.last_resume_dt)!.getTime()) / 1000) : 0;
  return (job.work_seconds || 0) + extra;
}

export function liveWaitMinutes(job: Pick<JobCard, "state" | "arrival_dt" | "wait_minutes">, skewMs = 0, now = Date.now()) {
  if (job.state !== "queued" || !job.arrival_dt) return job.wait_minutes || 0;
  return Math.max(0, (now + skewMs - d(job.arrival_dt)!.getTime()) / 60000);
}

export const STATE_LABEL: Record<string, string> = {
  queued: "Queued", assigned: "Assigned", washing: "Washing", paused: "Paused", quality_check: "Quality Check",
  ready: "Ready", completed: "Completed", cancelled: "Cancelled",
  pending: "Pending", confirmed: "Confirmed", arrived: "Arrived", checked_in: "Checked In", no_show: "No Show",
  available: "Available", reserved: "Reserved", busy: "Busy", cleaning: "Cleaning", maintenance: "Maintenance", offline: "Offline",
  unpaid: "Unpaid", partial: "Partial", paid: "Paid", refunded: "Refunded",
};
export const PRIORITY_LABEL: Record<string, string> = { normal: "Normal", priority: "Priority", vip: "VIP", prebooked: "Pre-booked" };

export const BOOKING_STATES = ["pending", "confirmed", "arrived", "checked_in", "queued", "assigned", "washing", "quality_check", "ready", "completed", "cancelled", "no_show"];
