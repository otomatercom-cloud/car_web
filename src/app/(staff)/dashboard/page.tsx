"use client";
import dynamic from "next/dynamic";
import { Car, Clock, Hourglass, IndianRupee, Warehouse, Activity, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MetricCard } from "@/components/cards";
import { Card, ErrorState, LoadingState, PageHeader, Skeleton } from "@/components/ui";
import { GreetingBanner } from "@/components/greeting-banner";
import { useDashboard, useMe } from "@/lib/client/hooks";
import { mins, money } from "@/lib/format";

const Charts = dynamic(() => import("@/components/dashboard-charts"), { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> });

export default function Dashboard() {
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const q = useDashboard(from || undefined, to || undefined);
  const me = useMe();
  if (q.isError && !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState rows={6} />;
  const d = q.data, m = d.operations.metrics;
  return (
    <div className="space-y-5">
      <GreetingBanner name={me.data?.name ?? "there"} summary={`${m.washing} washing · ${m.waiting} waiting · ${m.available_bays} bay${m.available_bays === 1 ? "" : "s"} free`} />
      <PageHeader title="Dashboard" subtitle="Manager overview" actions={<div className="flex gap-2"><input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-2 text-sm" /><input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-2 text-sm" /></div>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Vehicles today" value={m.vehicles_today} icon={<Car className="size-5" />} href="/jobs" />
        <MetricCard label="Revenue today" value={money(m.revenue_today)} icon={<IndianRupee className="size-5" />} tone="good" delta={d.revenue_vs_yesterday ?? undefined} sub="vs yesterday" href="/payments" />
        <MetricCard label="Washing now" value={m.washing} icon={<Activity className="size-5" />} href="/operations" />
        <MetricCard label="Waiting" value={m.waiting} icon={<Hourglass className="size-5" />} tone={m.over_critical ? "bad" : m.over_warn ? "warn" : "default"} sub={m.waiting ? `longest ${mins(m.max_wait)}` : "queue clear"} href="/queue" />
        <MetricCard label="Ready for pickup" value={m.ready} icon={<CheckCircle2 className="size-5" />} href="/operations" />
        <MetricCard label="Bays free" value={`${m.available_bays}/${m.total_bays}`} icon={<Warehouse className="size-5" />} href="/bays" />
        <MetricCard label="Avg wait today" value={mins(m.avg_wait_today)} icon={<Clock className="size-5" />} />
        <MetricCard label="Avg wash time" value={mins(m.avg_wash_minutes)} icon={<Clock className="size-5" />} />
      </div>
      <Charts d={d} />
      <Card>
        <h3 className="mb-2 font-bold">Staff productivity</h3>
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1">Name</th><th>Vehicles</th><th>Avg job</th><th>Revenue</th></tr></thead>
          <tbody>{d.staff_productivity.map((s) => <tr key={s.id} className="border-t border-line"><td className="py-2"><Link className="font-semibold hover:underline" href={`/staff/${s.id}`}>{s.name}</Link></td><td>{s.vehicles_completed}</td><td>{mins(s.avg_job_minutes)}</td><td>{money(s.revenue)}</td></tr>)}</tbody></table></div>
      </Card>
    </div>
  );
}
