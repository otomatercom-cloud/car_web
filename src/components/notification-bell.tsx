"use client";
import { AlertTriangle, Bell, CalendarPlus, CheckCircle2, Clock, Package, Star, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./ui";
import { useOperations } from "@/lib/client/hooks";
import type { Role } from "@/lib/rbac";

type Tone = "bad" | "warn" | "good" | "info";
interface Note { id: string; tone: Tone; icon: React.ComponentType<{ className?: string }>; title: string; text: string; href: string; demo?: boolean; manager?: boolean }

// Sample notifications so the bell is never empty while the shop is quiet. Delete this array (or set SHOW_SAMPLES=false)
// when you no longer want them — live alerts below come from the real operations feed.
const SHOW_SAMPLES = true;
const SAMPLES: Note[] = [
  { id: "demo-booking", tone: "info", icon: CalendarPlus, title: "New online booking", text: "BK-0001 · KL07 AB 1234 · tomorrow 10:30 AM", href: "/bookings", demo: true },
  { id: "demo-feedback", tone: "good", icon: Star, title: "5★ customer feedback", text: "“Spotless wash, very quick service!”", href: "/customers", demo: true },
  { id: "demo-package", tone: "warn", icon: Package, title: "Package expiring soon", text: "Gold Wash Pack (3 washes left) expires in 3 days", href: "/packages", demo: true },
];

const TONE: Record<Tone, string> = {
  bad: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
};

const KEY = "cw_notes_seen";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (v: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(v.slice(-200))); } catch { /* storage blocked: bell still works for this session */ } };

export function NotificationBell({ role }: { role: Role }) {
  const ops = useOperations();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [ring, setRing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setSeen(read()), []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const live = useMemo<Note[]>(() => {
    const d = ops.data;
    if (!d) return [];
    const m = d.metrics, out: Note[] = [];
    if (m.over_critical > 0) out.push({ id: `crit-${m.over_critical}`, tone: "bad", icon: AlertTriangle, title: `${m.over_critical} vehicle${m.over_critical > 1 ? "s" : ""} waiting too long`, text: `Over ${m.critical_min} min in queue (longest ${Math.round(m.max_wait)} min)`, href: "/queue" });
    else if (m.over_warn > 0) out.push({ id: `warn-${m.over_warn}`, tone: "warn", icon: Clock, title: `${m.over_warn} vehicle${m.over_warn > 1 ? "s" : ""} past ${m.warn_min} min`, text: "Customers are waiting — consider assigning a bay", href: "/queue" });
    if (m.available_bays === 0 && m.waiting > 0) out.push({ id: `full-${m.waiting}`, tone: "warn", icon: AlertTriangle, title: "All bays occupied", text: `${m.waiting} in queue`, href: "/operations" });
    for (const j of d.ready.slice(0, 5)) out.push({ id: `ready-${j.id}`, tone: "good", icon: CheckCircle2, title: `${j.vehicle.reg_no} is ready`, text: j.balance > 0 ? `Collect ₹${Math.round(j.balance)} before delivery` : "Paid — ready to hand over", href: `/jobs/${j.id}` });
    if (d.quality.length) out.push({ id: `qc-${d.quality.map((j) => j.id).join("-")}`, tone: "info", icon: CheckCircle2, title: `${d.quality.length} awaiting quality check`, text: d.quality.map((j) => j.vehicle.reg_no).join(", "), href: "/operations" });
    for (const b of d.bays.filter((b) => b.state === "maintenance" || b.state === "offline")) out.push({ id: `bay-${b.id}-${b.state}`, tone: "info", icon: Wrench, title: `${b.name} is ${b.state}`, text: "Not taking vehicles", href: `/bays/${b.id}` });
    return out;
  }, [ops.data]);

  const notes = useMemo(() => [...live, ...(SHOW_SAMPLES && role !== "operator" ? SAMPLES : [])], [live, role]);
  const unseen = notes.filter((n) => !seen.includes(n.id));
  const liveUnseen = unseen.filter((n) => !n.demo).length;

  // little wiggle whenever a new live alert appears
  const prev = useRef(0);
  useEffect(() => {
    if (liveUnseen > prev.current) { setRing(true); const t = setTimeout(() => setRing(false), 1500); prev.current = liveUnseen; return () => clearTimeout(t); }
    prev.current = liveUnseen;
  }, [liveUnseen]);

  const markAll = () => { const next = Array.from(new Set([...seen, ...notes.map((n) => n.id)])); setSeen(next); write(next); };
  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-xl p-2 text-muted hover:bg-surface-2" aria-label={`Notifications${unseen.length ? `, ${unseen.length} unread` : ""}`} aria-expanded={open}>
        <Bell className={cn("size-5", ring && "cw-bell-ring")} />
        {unseen.length > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-surface">{unseen.length > 9 ? "9+" : unseen.length}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="fixed inset-x-3 top-[68px] z-50 max-h-[75dvh] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold">Notifications</p>
            <button onClick={markAll} disabled={!unseen.length} className="text-xs font-semibold text-brand-600 disabled:text-muted">Mark all read</button>
          </div>
          <ul className="max-h-[60dvh] divide-y divide-line overflow-y-auto">
            {notes.length === 0 && <li className="p-6 text-center text-sm text-muted">You're all caught up.</li>}
            {notes.map((n) => {
              const Icon = n.icon, isNew = !seen.includes(n.id);
              return (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => { const next = Array.from(new Set([...seen, n.id])); setSeen(next); write(next); setOpen(false); }} className={cn("flex gap-3 px-4 py-3 hover:bg-surface-2", isNew && "bg-brand-50/60 dark:bg-brand-500/5")}>
                    <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", TONE[n.tone])}><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">{n.title}{n.demo && <span className="rounded bg-slate-200 px-1.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-200">Demo</span>}</span>
                      <span className="block truncate text-xs text-muted">{n.text}</span>
                    </span>
                    {isNew && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-label="unread" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
