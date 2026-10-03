import { cn } from "./ui";
import { PRIORITY_LABEL, STATE_LABEL } from "@/lib/format";

const TONES: Record<string, string> = {
  // job / booking
  queued: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  assigned: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  washing: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  paused: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  quality_check: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  completed: "bg-emerald-600 text-white",
  cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-600/30 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  arrived: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  checked_in: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  no_show: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  // bay
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  reserved: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  busy: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  cleaning: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  offline: "bg-slate-200 text-slate-600 dark:bg-slate-600/30 dark:text-slate-300",
  // payment
  unpaid: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  refunded: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  skipped: "bg-slate-200 text-slate-600 dark:bg-slate-600/30 dark:text-slate-300",
  // priority
  vip: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  priority: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  prebooked: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  normal: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[status] ?? TONES.normal, className)}>
      {label ?? STATE_LABEL[status] ?? PRIORITY_LABEL[status] ?? status}
    </span>
  );
}

export const PriorityBadge = ({ priority }: { priority: string }) =>
  priority === "normal" ? null : <StatusBadge status={priority} label={PRIORITY_LABEL[priority]} />;

/** Wait-time chip: green < warn < amber < critical < red (thresholds from manager settings). */
export function WaitBadge({ minutes, warn, critical, className }: { minutes: number; warn: number; critical: number; className?: string }) {
  const tone = minutes >= critical ? "bg-red-600 text-white animate-pulse" : minutes >= warn ? "bg-amber-500 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums", tone, className)}>{Math.floor(minutes)}m</span>;
}

export const BAY_DOT: Record<string, string> = {
  available: "bg-emerald-500", reserved: "bg-amber-500", busy: "bg-red-500", cleaning: "bg-sky-500", maintenance: "bg-orange-500", offline: "bg-slate-400",
};
