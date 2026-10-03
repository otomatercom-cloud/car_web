"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity, BadgeIndianRupee, BarChart3, CalendarClock, CalendarPlus, Car, ClipboardList, HardHat, History, Home, LayoutDashboard,
  ListOrdered, LogOut, Menu, Moon, Package, Receipt, Search, Send, Settings, Sparkles, Sun, User, UserPlus, Users, Wallet, Warehouse, Wrench, Droplets,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui";
import { StatusBadge } from "./status";
import { MOBILE_NAV, navFor, type Role } from "@/lib/rbac";
import { api } from "@/lib/client/api";
import { useDebounced } from "@/lib/client/hooks";
import { NotificationBell } from "./notification-bell";
import { useQuery } from "@tanstack/react-query";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity, BadgeIndianRupee, BarChart3, CalendarClock, CalendarPlus, Car, ClipboardList, HardHat, History, Home, LayoutDashboard,
  ListOrdered, Menu, Package, Receipt, Send, Settings, Sparkles, User, UserPlus, Users, Wallet, Warehouse, Wrench,
};
export const NavIcon = ({ name, className }: { name: string; className?: string }) => {
  const I = ICONS[name] ?? Activity;
  return <I className={className} />;
};

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Car Wash";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Toggle theme">
      {mounted && resolvedTheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

export function useLogout() {
  const router = useRouter();
  return async () => {
    await api.post("/api/auth/logout").catch(() => null);
    router.replace("/login");
    router.refresh();
  };
}

export function Sidebar({ role }: { role: Role }) {
  const path = usePathname();
  const items = navFor(role);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col border-r border-line bg-surface md:flex xl:w-64">
      <div className="flex h-16 items-center justify-center gap-2 border-b border-line xl:justify-start xl:px-5">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white"><Droplets className="size-5" /></span>
        <span className="hidden text-base font-extrabold tracking-tight xl:block">{APP_NAME}</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((n) => {
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} title={n.label} className={cn("flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition xl:justify-start", active ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200" : "text-muted hover:bg-surface-2 hover:text-ink")}>
              <NavIcon name={n.icon} className="size-5 shrink-0" />
              <span className="hidden xl:inline">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileBottomNav({ role }: { role: Role }) {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-xl justify-around">
        {MOBILE_NAV[role].map((n) => {
          const active = path === n.href || (n.href !== "/portal" && path.startsWith(n.href + "/"));
          return (
            <li key={n.href} className="flex-1">
              <Link href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", active ? "text-brand-600" : "text-muted")}>
                <NavIcon name={n.icon} className="size-6" />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const dq = useDebounced(q.trim(), 350);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const { data, isFetching } = useQuery({
    queryKey: ["search", dq],
    queryFn: () => api.get<any>(`/api/search?q=${encodeURIComponent(dq)}`),
    enabled: dq.length >= 2,
    staleTime: 10_000,
  });
  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };
  const top = data?.top;
  const empty = data && !top && !data.vehicles.length && !data.customers.length && !data.jobs.length && !data.bookings.length && !data.invoices.length;
  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search vehicle, mobile, job, booking, invoice…" className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      {open && dq.length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-2xl">
          {isFetching && !data && <p className="p-3 text-sm text-muted">Searching…</p>}
          {empty && <p className="p-3 text-sm text-muted">No matches for “{dq}”.</p>}
          {top && (
            <div className="mb-2 rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10">
              <div className="flex items-center justify-between">
                <button onClick={() => go(`/vehicles/${top.vehicle.id}`)} className="font-mono text-lg font-extrabold hover:underline">{top.vehicle.reg_no}</button>
                {top.current_job ? <StatusBadge status={top.current_job.state} /> : <span className="text-xs text-muted">No active job</span>}
              </div>
              <button onClick={() => go(`/customers/${top.vehicle.partner_id?.id}`)} className="text-sm font-semibold hover:underline">{top.vehicle.partner_id?.name}</button>
              <p className="text-xs text-muted">{top.totals.total_washes} washes · last {top.totals.last_wash ? new Date(top.totals.last_wash).toLocaleDateString() : "—"}</p>
              {top.current_job && <button onClick={() => go(`/jobs/${top.current_job.id}`)} className="mt-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">Open current job {top.current_job.name} →</button>}
              {top.jobs.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {top.jobs.slice(0, 3).map((j: any) => <li key={j.id}><button onClick={() => go(`/jobs/${j.id}`)} className="hover:underline">{j.name} · {j.services.join(", ")} · {j.state}</button></li>)}
                </ul>
              )}
            </div>
          )}
          <Group title="Vehicles" items={(data?.vehicles ?? []).filter((v: any) => v.id !== top?.vehicle.id).map((v: any) => ({ k: v.id, t: v.reg_no, s: v.partner_id?.name, href: `/vehicles/${v.id}` }))} go={go} />
          <Group title="Customers" items={(data?.customers ?? []).map((c: any) => ({ k: c.id, t: c.name, s: c.otm_cw_mobile, href: `/customers/${c.id}` }))} go={go} />
          <Group title="Jobs" items={(data?.jobs ?? []).map((j: any) => ({ k: j.id, t: `${j.name} · Token ${j.token}`, s: `${j.vehicle_id?.name} · ${j.state}`, href: `/jobs/${j.id}` }))} go={go} />
          <Group title="Bookings" items={(data?.bookings ?? []).map((b: any) => ({ k: b.id, t: b.name, s: `${b.vehicle_id?.name} · ${b.state}`, href: `/bookings` }))} go={go} />
          <Group title="Invoices" items={(data?.invoices ?? []).map((i: any) => ({ k: i.id, t: i.name, s: `₹${i.total}`, href: `/payments` }))} go={go} />
        </div>
      )}
    </div>
  );
}

function Group({ title, items, go }: { title: string; items: { k: number; t: string; s?: string; href: string }[]; go: (h: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="mb-1">
      <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">{title}</p>
      {items.map((i) => (
        <button key={i.k} onClick={() => go(i.href)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2">
          <span className="font-semibold">{i.t}</span><span className="text-xs text-muted">{i.s}</span>
        </button>
      ))}
    </div>
  );
}

/** Manager / reception / operator shell. */
export function StaffShell({ name, role, children }: { name: string; role: Role; children: ReactNode }) {
  const logout = useLogout();
  const showSearch = role !== "operator";
  return (
    <div className="min-h-dvh">
      <Sidebar role={role} />
      <div className="md:pl-[76px] xl:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-6">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white md:hidden"><Droplets className="size-5" /></span>
          {showSearch ? <GlobalSearch /> : <span className="font-bold md:hidden">{APP_NAME}</span>}
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell role={role} />
            <ThemeToggle />
            <span className="hidden px-2 text-right leading-tight sm:block"><span className="block text-sm font-semibold">{name}</span><span className="block text-[11px] capitalize text-muted">{role}</span></span>
            <button onClick={logout} className="rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Sign out"><LogOut className="size-5" /></button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 pb-28 md:p-6 md:pb-10">{children}</main>
      </div>
      <MobileBottomNav role={role} />
    </div>
  );
}

/** Customer portal shell — deliberately a different look (centered column, gradient hero header). */
export function PortalShell({ name, children }: { name: string; children: ReactNode }) {
  const logout = useLogout();
  const path = usePathname();
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50 via-bg to-bg dark:from-brand-900/30">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white"><Droplets className="size-5" /></span>
          <span className="font-extrabold tracking-tight">{APP_NAME}</span>
          <nav className="ml-6 hidden gap-1 md:flex">
            {navFor("customer").map((n) => (
              <Link key={n.href} href={n.href} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", path === n.href ? "bg-brand-600 text-white" : "text-muted hover:bg-surface-2")}>{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <span className="hidden text-sm font-semibold sm:block">{name}</span>
            <button onClick={logout} className="rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Sign out"><LogOut className="size-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 pb-28 md:pb-10">{children}</main>
      <MobileBottomNav role="customer" />
    </div>
  );
}
