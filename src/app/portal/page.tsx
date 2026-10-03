"use client";
import Link from "next/link";
import { useState } from "react";
import { QueuePosition, VehicleChip } from "@/components/cards";
import { StatusBadge } from "@/components/status";
import { WashTimer } from "@/components/wash-timer";
import { Button, Card, EmptyState, ErrorState, LoadingState, Modal, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";
import { fmtDateTime, fmtTime, money } from "@/lib/format";

export default function PortalHome() {
  const q = useGet<any>(["portal-home"], "/api/portal/home", 8000);
  const [fb, setFb] = useState<any>(null);
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  const d = q.data;
  return (
    <div className="space-y-5">
      <PageHeader title={`Hello, ${d.name.split(" ")[0]} 👋`} subtitle="Your car wash at a glance" actions={<Link href="/portal/book"><Button size="lg">Book a wash</Button></Link>} />
      {d.balance_due > 0 && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Balance due: {money(d.balance_due)}</p>}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Right now</h2>
        {d.active_jobs.length === 0 ? <EmptyState title="No vehicle in service" hint="When you drop off your car you'll see live progress here." /> : d.active_jobs.map((j: any) => (
          <Card key={j.id} className="space-y-3">
            <div className="flex items-start justify-between"><VehicleChip job={j} /><StatusBadge status={j.state} className="text-sm" /></div>
            <p className="text-sm">{j.services.join(" + ")}</p>
            {j.state === "queued" && <QueuePosition position={j.queue_position} minutes={j.estimated_minutes} />}
            {(j.state === "washing" || j.state === "paused") && <div className="rounded-2xl bg-surface-2 p-3 text-center"><WashTimer job={j} size="md" />{j.eta && <p className="mt-1 text-sm text-muted">Expected ready around <b>{fmtTime(j.eta)}</b></p>}</div>}
            {j.state === "ready" && <p className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">Your vehicle is ready for pickup!{j.balance > 0 && ` Please pay ${money(j.balance)} at the counter.`}</p>}
          </Card>))}
      </section>
      {d.upcoming.length > 0 && <section><h2 className="mb-2 text-lg font-bold">Upcoming bookings</h2><div className="space-y-2">{d.upcoming.map((b: any) => <Card key={b.id} className="flex items-center justify-between text-sm"><span><b>{b.name}</b> · {b.vehicle_id?.name}<span className="block text-muted">{fmtDateTime(b.slot_dt)}</span></span><StatusBadge status={b.state} /></Card>)}</div><Link className="mt-2 block text-sm font-semibold text-brand-600 underline" href="/portal/bookings">Manage bookings</Link></section>}
      {d.packages.length > 0 && <section><h2 className="mb-2 text-lg font-bold">Your packages</h2>{d.packages.map((p: any, i: number) => <Card key={i} className="mb-2 text-sm"><b>{p.package}</b><span className="text-muted"> · until {p.expiry}</span><p>{p.lines.map((l: any) => `${l.service}: ${l.remaining} left`).join(" · ")}</p></Card>)}</section>}
      <Link href="/portal/history" className="block text-center text-sm font-semibold text-brand-600 underline" onClick={() => setFb(null)}>View wash history & leave feedback</Link>
      <Modal open={!!fb} onClose={() => setFb(null)} title="Feedback"><span /></Modal>
    </div>
  );
}
void api; void useAction;
