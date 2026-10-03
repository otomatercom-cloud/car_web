"use client";
import { useState } from "react";
import { StatusBadge } from "@/components/status";
import { Button, Card, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, Textarea } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";
import { fmtDateTime, money } from "@/lib/format";

export default function History() {
  const q = useGet<any>(["portal-history"], "/api/portal/r/jobs?limit=50");
  const [job, setJob] = useState<any>(null), [rating, setRating] = useState(5), [comment, setComment] = useState("");
  const send = useAction(() => api.post("/api/portal/feedback", { jobId: job.id, rating, comment }), { success: "Thanks for your feedback!", invalidate: [["portal-history"]], onSuccess: () => { setJob(null); setComment(""); } });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="space-y-4">
      <PageHeader title="Wash history" />
      {q.data.items.length === 0 ? <EmptyState title="No washes yet" /> : q.data.items.map((j: any) => (
        <Card key={j.id} className="flex items-center justify-between gap-3 text-sm">
          <span><b>{j.vehicle_id?.name}</b> · {j.name}<span className="block text-muted">{fmtDateTime(j.arrival_dt)} · {money(j.amount_total)}</span></span>
          <span className="flex items-center gap-2"><StatusBadge status={j.state} />{j.state === "completed" && <Button size="sm" variant="secondary" onClick={() => setJob(j)}>Rate</Button>}</span>
        </Card>))}
      <Modal open={!!job} onClose={() => setJob(null)} title="How was your wash?">
        <div className="space-y-3"><div className="flex justify-center gap-1 text-3xl">{[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={n <= rating ? "text-amber-400" : "text-slate-300"}>★</button>)}</div>
          <Field label="Comments (optional)"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} /></Field><Button className="w-full" loading={send.isPending} onClick={() => send.mutate()}>Submit</Button></div>
      </Modal>
    </div>
  );
}
