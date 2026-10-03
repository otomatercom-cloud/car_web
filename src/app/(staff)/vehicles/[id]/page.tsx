"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { JobCard } from "@/components/cards";
import { StatusBadge } from "@/components/status";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet } from "@/lib/client/hooks";
import { fmtDate, fmtDateTime, money } from "@/lib/format";

export default function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useGet<any>(["vehicle", id], `/api/vehicles/${id}/summary`);
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState rows={5} />;
  const d = q.data, v = d.vehicle;
  return (
    <div className="space-y-4">
      <Link href="/vehicles" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="size-4" />Vehicles</Link>
      <PageHeader title={v.reg_no} subtitle={`${[v.brand, v.model, v.color].filter(Boolean).join(" ")} · ${v.vehicle_type_id?.name ?? ""}`} actions={v.partner_id && <Link className="text-sm font-semibold text-brand-600 underline" href={`/customers/${v.partner_id.id}`}>{v.partner_id.name}</Link>} />
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card><p className="text-xs text-muted">Washes</p><p className="text-2xl font-extrabold">{d.totals.total_washes}</p></Card>
        <Card><p className="text-xs text-muted">Spent</p><p className="text-2xl font-extrabold">{money(d.totals.total_spent)}</p></Card>
        <Card><p className="text-xs text-muted">Last wash</p><p className="text-lg font-bold">{fmtDate(d.totals.last_wash)}</p></Card>
      </div>
      {d.current_job && <section><h2 className="mb-2 font-bold">Currently in service</h2><JobCard job={d.current_job} href={`/jobs/${d.current_job.id}`} /></section>}
      {d.bookings.length > 0 && <Card><h3 className="mb-1 font-bold">Upcoming bookings</h3>{d.bookings.map((b: any) => <Link key={b.id} href={`/bookings/${b.id}`} className="flex justify-between py-1 text-sm"><span>{fmtDateTime(b.slot_dt)}</span><StatusBadge status={b.state} /></Link>)}</Card>}
      {d.damage_history.length > 0 && <Card><h3 className="mb-1 font-bold">Damage notes</h3>{d.damage_history.map((x: any, i: number) => <p key={i} className="text-sm"><b>{x.job}</b> ({x.kind}): {x.notes}</p>)}</Card>}
      <section><h2 className="mb-2 font-bold">Wash history</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.jobs.map((j: any) => <JobCard key={j.id} job={j} href={`/jobs/${j.id}`} />)}</div></section>
    </div>
  );
}
