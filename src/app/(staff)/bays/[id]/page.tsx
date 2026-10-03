"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { BayCard, JobCard } from "@/components/cards";
import { JobControls } from "@/components/job-panel";
import { StatusBadge } from "@/components/status";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useMe, useOperations, useSkew } from "@/lib/client/hooks";
import { useList } from "@/lib/client/hooks";
import { mins } from "@/lib/format";

export default function BayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ops = useOperations(), me = useMe();
  const skew = useSkew(ops.data?.server_now);
  const hist = useList("/api/r/jobs", { limit: 10, filters: { bay_id: id } });
  if (ops.isError && !ops.data) return <ErrorState onRetry={() => ops.refetch()} />;
  if (!ops.data) return <LoadingState />;
  const bay = ops.data.bays.find((b) => String(b.id) === id);
  if (!bay) return <ErrorState message="Bay not found." />;
  return (
    <div className="space-y-4">
      <Link href="/bays" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="size-4" />Bays</Link>
      <PageHeader title={bay.name} actions={<StatusBadge status={bay.state} className="text-sm" />} />
      <BayCard bay={bay} skew={skew} metrics={ops.data.metrics} />
      {bay.job && <Card><JobControls job={bay.job} role={me.data?.role ?? "reception"} /></Card>}
      <section><h2 className="mb-2 font-bold">Recent jobs in this bay</h2>
        <div className="space-y-2">{hist.data?.items.map((j: any) => <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-sm"><span><b>{j.name}</b> · {j.vehicle_id?.name}</span><span className="flex items-center gap-2">{j.work_seconds ? mins(j.work_seconds / 60) : ""}<StatusBadge status={j.state} /></span></Link>)}</div></section>
    </div>
  );
}
void JobCard;
