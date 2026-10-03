"use client";
import { Activity, Clock, Hourglass, IndianRupee, Warehouse, Car, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BayCard, MetricCard, QueueCard, JobCard } from "@/components/cards";
import { JobControls } from "@/components/job-panel";
import { Button, EmptyState, ErrorState, LoadingState, Modal, PageHeader } from "@/components/ui";
import { useMe, useOperations, useSkew } from "@/lib/client/hooks";
import { mins, money } from "@/lib/format";
import type { JobCard as Job } from "@/lib/types";

export default function OperationsPage() {
  const ops = useOperations();
  const me = useMe();
  const skew = useSkew(ops.data?.server_now);
  const [sel, setSel] = useState<Job | null>(null);
  if (ops.isError && !ops.data) return <ErrorState onRetry={() => ops.refetch()} />;
  if (!ops.data) return <LoadingState rows={6} />;
  const d = ops.data, m = d.metrics, role = me.data?.role ?? "reception";
  const open = (id: number | null | undefined) => {
    const j = [...d.bays.map((b) => b.job), ...d.queue, ...d.ready, ...d.quality].find((x) => x && x.id === id);
    if (j) setSel(j);
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Live Operations" subtitle={<span className="inline-flex items-center gap-2"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" /></span>Live · refreshes every {Math.round((d.refreshMs ?? 5000) / 1000)}s</span>}
        actions={<Link href="/walk-in"><Button size="lg">+ Walk-in</Button></Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MetricCard label="Vehicles today" value={m.vehicles_today} icon={<Car className="size-5" />} />
        <MetricCard label="Revenue today" value={money(m.revenue_today)} icon={<IndianRupee className="size-5" />} tone="good" />
        <MetricCard label="Washing" value={m.washing} icon={<Activity className="size-5" />} />
        <MetricCard label="Waiting" value={m.waiting} icon={<Hourglass className="size-5" />} tone={m.over_critical ? "bad" : m.over_warn ? "warn" : "default"} sub={m.waiting ? `longest ${mins(m.max_wait)}` : undefined} />
        <MetricCard label="Available bays" value={`${m.available_bays}/${m.total_bays}`} icon={<Warehouse className="size-5" />} tone={m.available_bays === 0 ? "bad" : "default"} />
        <MetricCard label="Avg wait today" value={mins(m.avg_wait_today)} sub={`avg wash ${mins(m.avg_wash_minutes)}`} icon={<Clock className="size-5" />} />
      </div>
      {m.available_bays === 0 && m.waiting > 0 && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">All bays are occupied. New vehicles join the queue and are assigned automatically when a bay frees up.</p>}
      <section>
        <h2 className="mb-2 text-lg font-bold">Bays</h2>
        {d.bays.length === 0 ? <EmptyState title="No bays configured" hint="Add bays under Bays." /> :
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{d.bays.map((b) => <BayCard key={b.id} bay={b} skew={skew} metrics={m} onClick={() => b.job && open(b.job.id)} />)}</div>}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="mb-2 text-lg font-bold">Waiting queue ({d.queue.length})</h2>
          <div className="space-y-2">
            {d.queue.length === 0 ? <EmptyState title="No vehicles waiting" /> : d.queue.map((j) => <div key={j.id} onClick={() => setSel(j)} className="cursor-pointer"><QueueCard job={j} skew={skew} metrics={m} /></div>)}
          </div>
        </section>
        <section className="min-w-0 space-y-5">
          <div>
            <h2 className="mb-2 text-lg font-bold">Quality check ({d.quality.length})</h2>
            <div className="space-y-2">{d.quality.length === 0 ? <p className="text-sm text-muted">None.</p> : d.quality.map((j) => <div key={j.id} onClick={() => setSel(j)} className="cursor-pointer"><JobCard job={j} skew={skew} /></div>)}</div>
          </div>
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="size-5 text-emerald-600" />Ready for delivery ({d.ready.length})</h2>
            <div className="space-y-2">{d.ready.length === 0 ? <p className="text-sm text-muted">None.</p> : d.ready.map((j) => <div key={j.id} onClick={() => setSel(j)} className="cursor-pointer"><JobCard job={j} skew={skew} /></div>)}</div>
          </div>
        </section>
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.vehicle.reg_no} · ${sel.name}` : ""} wide>
        {sel && (() => {
          const live = [...d.bays.map((b) => b.job), ...d.queue, ...d.ready, ...d.quality].find((x) => x && x.id === sel.id);
          if (!live) return <p className="text-sm text-muted">This job has moved on.</p>;
          return <div className="space-y-3"><JobCard job={live} skew={skew} /><JobControls job={live} role={role} /><Link className="block text-center text-sm font-semibold text-brand-600 underline" href={`/jobs/${live.id}`}>Open full job card</Link></div>;
        })()}
      </Modal>
    </div>
  );
}
