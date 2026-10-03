"use client";
import { StatusBadge } from "@/components/status";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet, useStatic } from "@/lib/client/hooks";
import { fmtDate, money } from "@/lib/format";

export default function PortalPackages() {
  const cfg = useStatic();
  const q = useGet<any>(["portal-subs"], "/api/portal/r/subscriptions?limit=50");
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="space-y-5">
      <PageHeader title="My packages" />
      {q.data.items.length === 0 ? <EmptyState title="No active packages" /> : q.data.items.map((s: any) => <Card key={s.id} className="text-sm"><div className="flex justify-between"><b>{s.package_id?.name}</b><StatusBadge status={s.expired ? "expired" : "active"} /></div><p className="text-muted">Valid until {fmtDate(s.expiry_date)}</p><p>{s.lines.map((l: any) => `${l.service}: ${l.remaining}/${l.total}`).join(" · ")}</p></Card>)}
      <section><h2 className="mb-2 text-lg font-bold">Available packages</h2><div className="grid gap-3 sm:grid-cols-2">{cfg.data?.packages.map((p) => <Card key={p.id} className="text-sm"><b>{p.name}</b> · {money(p.price)}<p className="text-muted">{p.validity_days} days · {p.lines.map((l) => `${l.service} ×${l.qty}`).join(", ")}</p></Card>)}</div><p className="mt-2 text-xs text-muted">Ask at the counter to purchase a package.</p></section>
    </div>
  );
}
