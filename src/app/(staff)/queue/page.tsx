"use client";
import { QueueCard } from "@/components/cards";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { JobControls } from "@/components/job-panel";
import { useMe, useOperations, useSkew } from "@/lib/client/hooks";
import { mins } from "@/lib/format";

export default function QueuePage() {
  const ops = useOperations();
  const me = useMe();
  const skew = useSkew(ops.data?.server_now);
  if (ops.isError && !ops.data) return <ErrorState onRetry={() => ops.refetch()} />;
  if (!ops.data) return <LoadingState />;
  const m = ops.data.metrics;
  const role = me.data?.role ?? "operator";
  const mode = ops.data.queue[0]?.assign_reason;
  return (
    <div className="space-y-4">
      <PageHeader title="Queue" subtitle={`${ops.data.queue.length} waiting · longest ${mins(m.max_wait)} · ${m.available_bays} bay(s) free`} />
      {mode && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200"><b>Next up:</b> {mode}</p>}
      {ops.data.queue.length === 0 ? <EmptyState title="Queue is empty" hint="New walk-ins and arrived bookings appear here." /> : (
        <div className="space-y-2">
          {ops.data.queue.map((j) => <QueueCard key={j.id} job={j} skew={skew} metrics={m} actions={role !== "operator" ? <JobControls job={j} role={role} /> : undefined} />)}
        </div>
      )}
    </div>
  );
}
