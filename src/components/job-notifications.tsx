"use client";
import { Bell, Send } from "lucide-react";
import { Button, Card } from "./ui";
import { StatusBadge } from "./status";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";
import { fmtDateTime } from "@/lib/format";

const LABEL: Record<string, string> = { vehicle_assigned: "Assigned to bay", wash_started: "Wash started", vehicle_ready: "Ready", delivered: "Delivered", vehicle_arrived: "Checked in", payment_pending: "Balance due" };

/** Staff view: what the customer was told for this job + manual (re)send. */
export function JobNotifications({ jobId, state }: { jobId: number; state: string }) {
  const q = useGet<any[]>(["job-notes", String(jobId)], `/api/jobs/${jobId}/notifications`, 8000);
  const send = useAction((event: string) => api.post(`/api/jobs/${jobId}/notify`, { event }), { success: "Message queued", invalidate: [["job-notes", String(jobId)]] });
  const canAssigned = !["queued", "cancelled"].includes(state), canReady = ["ready", "completed"].includes(state);
  return (
    <Card className="space-y-3">
      <h3 className="flex items-center gap-2 font-bold"><Bell className="size-4" />Customer notifications</h3>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={!canAssigned} loading={send.isPending} onClick={() => send.mutate("vehicle_assigned")}><Send className="size-3.5" />Send assigned</Button>
        <Button size="sm" variant="secondary" disabled={!canReady} loading={send.isPending} onClick={() => send.mutate("vehicle_ready")}><Send className="size-3.5" />Send ready</Button>
      </div>
      {q.data?.length ? (
        <ul className="space-y-2 text-sm">
          {q.data.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span><b>{LABEL[n.event] ?? n.event}</b> · <span className="capitalize">{n.channel}</span>{n.error && <span className="block text-xs text-red-600">{n.error}</span>}</span>
              <span className="flex items-center gap-2"><span className="text-xs text-muted">{fmtDateTime(n.sent_dt || n.create_date)}</span><StatusBadge status={n.state} /></span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">Nothing sent yet.</p>}
    </Card>
  );
}
