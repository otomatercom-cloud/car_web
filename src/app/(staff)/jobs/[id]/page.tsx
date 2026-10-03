"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { JobNotifications } from "@/components/job-notifications";
import { JobDetailView } from "@/components/job-panel";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet, useMe } from "@/lib/client/hooks";
import type { JobCard } from "@/lib/types";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const me = useMe();
  const q = useGet<JobCard>(["job", id], `/api/jobs/${id}`, 5000);
  if (q.isError) return <ErrorState message="This job could not be loaded." onRetry={() => q.refetch()} />;
  if (!q.data || !me.data) return <LoadingState rows={6} />;
  return (
    <div className="space-y-4">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Jobs</Link>
      <PageHeader title={`${q.data.vehicle.reg_no} · ${q.data.name}`} />
      <JobDetailView job={q.data} role={me.data.role} />
      {["manager", "reception"].includes(me.data.role) && <JobNotifications jobId={q.data.id} state={q.data.state} />}
    </div>
  );
}
