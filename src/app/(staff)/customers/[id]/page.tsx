"use client";
import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { JobCard, VehicleCard } from "@/components/cards";
import { StatusBadge } from "@/components/status";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet } from "@/lib/client/hooks";
import { fmtDate, fmtDateTime, money } from "@/lib/format";

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useGet<any>(["customer", id], `/api/customer/${id}/summary`);
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState rows={6} />;
  const d = q.data, c = d.customer;
  return (
    <div className="space-y-4">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="size-4" />Customers</Link>
      <PageHeader title={c.name} subtitle={<span className="flex items-center gap-2"><Phone className="size-4" />{c.otm_cw_mobile} <StatusBadge status={c.otm_cw_customer_type || "standard"} /></span>} />
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card><p className="text-xs text-muted">Visits</p><p className="text-2xl font-extrabold">{d.totals.visits}</p></Card>
        <Card><p className="text-xs text-muted">Paid</p><p className="text-2xl font-extrabold">{money(d.totals.revenue)}</p></Card>
        <Card><p className="text-xs text-muted">Last visit</p><p className="text-lg font-bold">{fmtDate(d.totals.last_visit)}</p></Card>
      </div>
      <section><h2 className="mb-2 font-bold">Vehicles</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.vehicles.map((v: any) => <VehicleCard key={v.id} v={v} href={`/vehicles/${v.id}`} />)}{d.vehicles.length === 0 && <p className="text-sm text-muted">No vehicles.</p>}</div></section>
      <section><h2 className="mb-2 font-bold">Recent jobs</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.jobs.map((j: any) => <JobCard key={j.id} job={j} href={`/jobs/${j.id}`} />)}{d.jobs.length === 0 && <p className="text-sm text-muted">No jobs yet.</p>}</div></section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-2 font-bold">Packages</h3>{d.packages.length === 0 ? <p className="text-sm text-muted">None.</p> : d.packages.map((p: any, i: number) => <div key={i} className="mb-2 text-sm"><b>{p.package}</b> <span className="text-muted">till {fmtDate(p.expiry)}</span>{p.expired && <StatusBadge status="expired" />}<p className="text-xs text-muted">{p.lines.map((l: any) => `${l.service}: ${l.remaining}/${l.total}`).join(" · ")}</p></div>)}</Card>
        <Card><h3 className="mb-2 font-bold">Payments & invoices</h3><ul className="space-y-1 text-sm">{d.payments.slice(0, 8).map((p: any) => <li key={p.id} className="flex justify-between"><span>{p.job_id?.name} · {p.method}<span className="block text-xs text-muted">{fmtDateTime(p.dt)}</span></span><b>{money(p.amount)}</b></li>)}{d.invoices.map((m: any) => <li key={m.id} className="flex justify-between text-muted"><span>{m.name}</span><span>{money(m.total)}</span></li>)}</ul></Card>
        <Card><h3 className="mb-2 font-bold">Bookings</h3>{d.bookings.length === 0 ? <p className="text-sm text-muted">None.</p> : d.bookings.map((b: any) => <Link key={b.id} href={`/bookings/${b.id}`} className="flex justify-between py-1 text-sm"><span>{b.name} · {fmtDateTime(b.slot_dt)}</span><StatusBadge status={b.state} /></Link>)}</Card>
        <Card><h3 className="mb-2 font-bold">Feedback</h3>{d.feedback.length === 0 ? <p className="text-sm text-muted">None.</p> : d.feedback.map((f: any) => <p key={f.id} className="text-sm">{"★".repeat(f.rating)} {f.comment}</p>)}</Card>
      </div>
    </div>
  );
}
