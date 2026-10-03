"use client";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Car, Clock, Phone, User, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { cn, Card } from "./ui";
import { BAY_DOT, PriorityBadge, StatusBadge, WaitBadge } from "./status";
import { WashTimer } from "./wash-timer";
import { fmtDate, liveWaitMinutes, mins, money } from "@/lib/format";
import { useTick } from "@/lib/client/hooks";
import type { BayView, JobCard as Job, Metrics, StaffPerf } from "@/lib/types";

/** Large KPI tile. `DashboardCard` is an alias used by the dashboard page. */
export function MetricCard({ label, value, sub, delta, icon, tone = "default", href }: {
  label: string; value: ReactNode; sub?: ReactNode; delta?: number | null; icon?: ReactNode; tone?: "default" | "good" | "warn" | "bad"; href?: string;
}) {
  const body = (
    <Card className={cn("h-full transition hover:shadow-md", tone === "bad" && "border-red-300 dark:border-red-900", tone === "warn" && "border-amber-300 dark:border-amber-900", tone === "good" && "border-emerald-300 dark:border-emerald-900")}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon && <span className="text-brand-600">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-sm text-muted">
        {delta !== undefined && delta !== null && (
          <span className={cn("inline-flex items-center font-semibold", delta >= 0 ? "text-emerald-600" : "text-red-600")}>
            {delta >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            {Math.abs(delta)}%
          </span>
        )}
        {sub}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
export const DashboardCard = MetricCard;

export const VehicleChip = ({ job }: { job: Pick<Job, "vehicle"> }) => (
  <div>
    <p className="font-mono text-base font-extrabold tracking-wide">{job.vehicle.reg_no}</p>
    <p className="text-xs text-muted">{[job.vehicle.type, job.vehicle.brand, job.vehicle.model].filter(Boolean).join(" · ")}</p>
  </div>
);

/** One bay on the control board. */
export function BayCard({ bay, skew, metrics, onClick }: { bay: BayView; skew: number; metrics?: Metrics; onClick?: () => void }) {
  const j = bay.job;
  const busy = bay.state === "busy";
  return (
    <button onClick={onClick} className={cn("w-full rounded-2xl border bg-surface p-4 text-left shadow-sm transition hover:shadow-md", busy ? "border-red-300 dark:border-red-900" : "border-line")}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold">{bay.name}</h3>
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-muted">
          <span className={cn("size-3 rounded-full", BAY_DOT[bay.state], busy && "pulse-busy")} />
          {bay.state === "available" ? "Free" : bay.state}
        </span>
      </div>
      {j ? (
        <div className="mt-3 space-y-2">
          <VehicleChip job={j} />
          <p className="text-sm font-medium">{j.services.join(" + ")}</p>
          <div className="flex items-center justify-between">
            {j.state === "washing" || j.state === "paused" ? <WashTimer job={j} skew={skew} size="md" /> : <StatusBadge status={j.state} />}
            <span className="text-xs text-muted">Est. {mins(j.estimated_minutes)}</span>
          </div>
          <p className="truncate text-xs text-muted"><User className="mr-1 inline size-3" />{j.staff.join(", ") || "No staff assigned"}</p>
        </div>
      ) : (
        <div className="mt-3 flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
          <Wrench className="mb-1 size-5 opacity-40" />
          {bay.state === "available" ? "Ready for next vehicle" : bay.state === "maintenance" ? "Under maintenance" : bay.state}
          {bay.staff.length > 0 && <span className="mt-1 text-xs">{bay.staff.join(", ")}</span>}
        </div>
      )}
    </button>
  );
}

/** One waiting vehicle. Shows live wait + why/when it will be picked. */
export function QueueCard({ job, skew, metrics, actions, compact }: { job: Job; skew: number; metrics?: Metrics; actions?: ReactNode; compact?: boolean }) {
  useTick(true);
  const wait = liveWaitMinutes(job, skew);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        <span className="text-[10px] font-bold uppercase leading-none">Token</span>
        <span className="text-xl font-extrabold leading-tight">{job.token}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <VehicleChip job={job} />
          <PriorityBadge priority={job.priority} />
        </div>
        {!compact && <p className="mt-0.5 truncate text-sm">{job.services.join(" + ")} · {job.customer.name}</p>}
        {!compact && job.eligible_bays.length > 0 && <p className="text-xs text-muted">Eligible bays: {job.eligible_bays.join(", ")}</p>}
        {!compact && job.eligible_bays.length === 0 && <p className="text-xs font-medium text-red-600">No eligible bay is online for this vehicle</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <WaitBadge minutes={wait} warn={metrics?.warn_min ?? 15} critical={metrics?.critical_min ?? 30} />
        {job.queue_position && <span className="text-xs font-semibold text-muted">#{job.queue_position} in line</span>}
        {actions}
      </div>
    </div>
  );
}

/** Compact job summary row/card used in lists. */
export function JobCard({ job, skew = 0, href, extra }: { job: Job; skew?: number; href?: string; extra?: ReactNode }) {
  const inner = (
    <Card className="transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">{job.name} · Token {job.token}</p>
          <VehicleChip job={job} />
        </div>
        <div className="flex flex-col items-end gap-1"><StatusBadge status={job.state} /><PriorityBadge priority={job.priority} /></div>
      </div>
      <p className="mt-2 text-sm font-medium">{job.services.join(" + ")}</p>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted"><User className="mr-1 inline size-3.5" />{job.customer.name}</span>
        {(job.state === "washing" || job.state === "paused") ? <WashTimer job={job} skew={skew} size="sm" /> : <span className="font-semibold">{money(job.amount_total)}</span>}
      </div>
      {job.bay && <p className="mt-1 text-xs text-muted">{job.bay.name} · {job.staff.join(", ")}</p>}
      {extra}
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function VehicleCard({ v, href }: { v: Record<string, any>; href?: string }) {
  const body = (
    <Card className="flex items-center gap-3 transition hover:shadow-md">
      <div className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"><Car className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-mono font-extrabold tracking-wide">{v.reg_no}</p>
        <p className="truncate text-xs text-muted">{[v.vehicle_type_id?.name, v.brand, v.model, v.color].filter(Boolean).join(" · ")}</p>
      </div>
      {v.total_washes !== undefined && <span className="text-xs text-muted">{v.total_washes} washes</span>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function CustomerCard({ c, href }: { c: Record<string, any>; href?: string }) {
  const body = (
    <Card className="transition hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">{c.name}</p>
        {c.otm_cw_customer_type && c.otm_cw_customer_type !== "standard" && <StatusBadge status={c.otm_cw_customer_type === "vip" ? "vip" : "prebooked"} label={c.otm_cw_customer_type} />}
      </div>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted"><Phone className="size-3.5" />{c.otm_cw_mobile || "—"}</p>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{c.visits ?? 0} visits · {c.vehicle_count ?? 0} vehicles</span>
        <span>{money(c.revenue)}</span>
      </div>
      {c.last_visit && <p className="mt-1 text-xs text-muted"><Clock className="mr-1 inline size-3" />Last visit {fmtDate(c.last_visit)}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function StaffCard({ s, perf, href }: { s: Record<string, any>; perf?: StaffPerf; href?: string }) {
  const initials = String(s.name || "?").split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase();
  const body = (
    <Card className="flex items-center gap-3 transition hover:shadow-md">
      <div className="grid size-12 place-items-center rounded-full bg-brand-100 font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">{initials}</div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{s.name}</p>
        <p className="text-xs capitalize text-muted">{s.otm_cw_role} · {s.otm_cw_shift || "No shift set"}</p>
      </div>
      <div className="text-right text-xs text-muted">
        {s.otm_cw_available === false && <StatusBadge status="offline" label="Unavailable" />}
        {perf && <p className="mt-1 font-semibold text-ink">{perf.vehicles_completed} cars</p>}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Customer-facing "you are #N in line". */
export function QueuePosition({ position, minutes }: { position: number | null; minutes?: number }) {
  if (!position) return null;
  return (
    <div className="rounded-2xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="text-sm font-semibold">Your position in line</p>
      <p className="text-4xl font-extrabold">#{position}</p>
      {minutes !== undefined && <p className="text-sm">Waiting for {Math.floor(minutes)} min so far</p>}
    </div>
  );
}
