"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { JobCard, MetricCard } from "@/components/cards";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet } from "@/lib/client/hooks";
import { mins, money } from "@/lib/format";

export default function StaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const q = useGet<any>(["staff", id, from, to], `/api/staff/${id}/performance?date_from=${from}&date_to=${to}`);
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState rows={5} />;
  const s = q.data.staff, p = q.data.performance;
  return (
    <div className="space-y-4">
      <Link href="/staff" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="size-4" />Staff</Link>
      <PageHeader title={s.name} subtitle={`${s.otm_cw_role} · ${s.otm_cw_shift || "no shift set"}`} actions={<div className="flex gap-2"><input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-2 text-sm" /><input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-2 text-sm" /></div>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Vehicles" value={p?.vehicles_completed ?? 0} /><MetricCard label="Services" value={p?.services_completed ?? 0} />
        <MetricCard label="Avg time / job" value={mins(p?.avg_job_minutes)} /><MetricCard label="Revenue" value={money(p?.revenue)} />
        <MetricCard label="Work time" value={mins(p?.total_work_minutes)} /><MetricCard label="Jobs / day" value={p?.jobs_per_day ?? 0} />
        <MetricCard label="Jobs / hour" value={p?.jobs_per_hour ?? 0} /><MetricCard label="Avg customer wait" value={mins(p?.avg_wait_minutes)} />
      </div>
      {q.data.current_jobs.length > 0 && <section><h2 className="mb-2 font-bold">Working on</h2><div className="grid gap-3 sm:grid-cols-2">{q.data.current_jobs.map((j: any) => <JobCard key={j.id} job={j} href={`/jobs/${j.id}`} />)}</div></section>}
      <section><h2 className="mb-2 font-bold">Recent jobs</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{q.data.recent_jobs.map((j: any) => <JobCard key={j.id} job={j} href={`/jobs/${j.id}`} />)}</div></section>
    </div>
  );
}
