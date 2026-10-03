"use client";
import { useQuery } from "@tanstack/react-query";
import { JobCard } from "@/components/cards";
import { JobControls } from "@/components/job-panel";
import { WashTimer } from "@/components/wash-timer";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { VehicleChip } from "@/components/cards";
import { StatusBadge } from "@/components/status";
import { api } from "@/lib/client/api";
import { useMe, useSkew } from "@/lib/client/hooks";
import type { JobCard as Job } from "@/lib/types";
import Link from "next/link";

export default function MyJobs() {
  const me = useMe();
  const q = useQuery({ queryKey: ["my-jobs"], queryFn: () => api.get<{ server_now: string; current_jobs: Job[]; recent_jobs: Job[] }>("/api/my/jobs"), refetchInterval: 5000, refetchIntervalInBackground: false });
  const skew = useSkew(q.data?.server_now);
  if (q.isError && !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="space-y-4">
      <PageHeader title="My Jobs" subtitle="Vehicles assigned to you" />
      {q.data.current_jobs.length === 0 ? <EmptyState title="No vehicle assigned" hint="You'll see your next job here as soon as one is assigned to your bay." /> :
        q.data.current_jobs.map((j) => (
          <Card key={j.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-semibold text-muted">{j.bay?.name} · Token {j.token}</p><VehicleChip job={j} /><p className="mt-1 text-sm">{j.services.join(" + ")}</p></div>
              <StatusBadge status={j.state} className="text-sm" />
            </div>
            {(j.state === "washing" || j.state === "paused") && <div className="rounded-2xl bg-surface-2 p-4 text-center"><WashTimer job={j} skew={skew} size="xl" showCompare /></div>}
            <JobControls job={j} role={me.data?.role ?? "operator"} big />
            <Link href={`/jobs/${j.id}`} className="block text-center text-sm font-semibold text-brand-600 underline">Full details & photos</Link>
          </Card>
        ))}
    </div>
  );
}
