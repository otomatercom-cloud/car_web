"use client";
import { useState } from "react";
import { StatusBadge } from "@/components/status";
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";
import { fmtDateTime, money } from "@/lib/format";

export default function PortalBookings() {
  const q = useGet<any>(["portal-bookings"], "/api/portal/r/bookings?limit=50");
  const [cancel, setCancel] = useState<any>(null);
  const c = useAction((id: number) => api.post(`/api/portal/bookings/${id}/cancel`, {}), { success: "Booking cancelled", invalidate: [["portal-bookings"], ["portal-home"]], onSuccess: () => setCancel(null) });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="space-y-4">
      <PageHeader title="My bookings" />
      {q.data.items.length === 0 ? <EmptyState title="No bookings yet" /> : q.data.items.map((b: any) => (
        <Card key={b.id} className="flex items-center justify-between gap-3 text-sm">
          <span><b>{b.name}</b> · {b.vehicle_id?.name}<span className="block text-muted">{fmtDateTime(b.slot_dt)} · {money(b.amount_total)}</span></span>
          <span className="flex items-center gap-2"><StatusBadge status={b.state} />{["pending", "confirmed"].includes(b.state) && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setCancel(b)}>Cancel</Button>}</span>
        </Card>))}
      <ConfirmDialog open={!!cancel} danger title="Cancel booking?" message={cancel ? `${cancel.name} on ${fmtDateTime(cancel.slot_dt)}` : ""} confirmLabel="Cancel booking" loading={c.isPending} onClose={() => setCancel(null)} onConfirm={() => c.mutate(cancel.id)} />
    </div>
  );
}
