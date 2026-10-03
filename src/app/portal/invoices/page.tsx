"use client";
import { StatusBadge } from "@/components/status";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet } from "@/lib/client/hooks";
import { fmtDate, money } from "@/lib/format";

export default function Invoices() {
  const q = useGet<any>(["portal-invoices"], "/api/portal/invoices");
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="space-y-4">
      <PageHeader title="Invoices" />
      {q.data.items.length === 0 ? <EmptyState title="No invoices yet" /> : q.data.items.map((m: any) => <Card key={m.id} className="flex items-center justify-between text-sm"><span><b>{m.name}</b><span className="block text-muted">{fmtDate(m.date)} · {m.origin}</span></span><span className="flex items-center gap-2"><b>{money(m.total, true)}</b><StatusBadge status={m.payment_state === "paid" ? "paid" : "unpaid"} /></span></Card>)}
    </div>
  );
}
