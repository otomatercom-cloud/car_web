"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { StatusBadge } from "@/components/status";
import { Button, Card, ConfirmDialog, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";
import { fmtDateTime, money } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ["booking", id], queryFn: () => api.get<any>(`/api/r/bookings?limit=1&f.id=${Number(id)}`).then((r) => r.items[0] ?? Promise.reject(new Error("nf"))) });
  const [cancel, setCancel] = useState(false);
  const act = useAction((a: string) => api.post(`/api/bookings/${id}/action`, { action: a }), { success: "Booking updated", invalidate: [["booking", id], ["list"], ["operations"]] });
  void useGet;
  if (q.isError) return <ErrorState message="Booking not found." onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  const b = q.data, s = b.state;
  return (
    <div className="space-y-4">
      <Link href="/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="size-4" />Bookings</Link>
      <PageHeader title={b.name} subtitle={fmtDateTime(b.slot_dt)} actions={<StatusBadge status={s} className="text-sm" />} />
      <Card className="space-y-2 text-sm">
        <p><b>Customer:</b> <Link className="underline" href={`/customers/${b.partner_id?.id}`}>{b.partner_id?.name}</Link></p>
        <p><b>Vehicle:</b> <Link className="underline" href={`/vehicles/${b.vehicle_id?.id}`}>{b.vehicle_id?.name}</Link></p>
        <p><b>Estimated amount:</b> {money(b.amount_total)} · <b>Source:</b> {b.source}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        {s === "pending" && <Button loading={act.isPending} onClick={() => act.mutate("confirm")}>Confirm</Button>}
        {["confirmed", "arrived"].includes(s) && <Button variant="success" loading={act.isPending} onClick={() => act.mutate("check_in")}>Check in → queue</Button>}
        {s === "confirmed" && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate("arrive")}>Mark arrived</Button>}
        {["confirmed", "arrived"].includes(s) && <Button variant="warn" loading={act.isPending} onClick={() => act.mutate("no_show")}>No show</Button>}
        {["pending", "confirmed", "arrived"].includes(s) && <Button variant="ghost" className="text-red-600" onClick={() => setCancel(true)}>Cancel booking</Button>}
      </div>
      <ConfirmDialog open={cancel} danger title="Cancel this booking?" message="The customer's slot will be released." confirmLabel="Cancel booking" onClose={() => setCancel(false)} onConfirm={() => { act.mutate("cancel"); setCancel(false); }} />
    </div>
  );
}
