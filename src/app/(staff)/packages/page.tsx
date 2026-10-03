"use client";
import { useState } from "react";
import { ResourcePage } from "@/components/crud";
import { StatusBadge } from "@/components/status";
import { Button, Field, Input, Modal, Select, Card, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useDebounced, useList, useMe, useStatic } from "@/lib/client/hooks";
import { fmtDate, money } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";

export default function Packages() {
  const cfg = useStatic(), me = useMe();
  const [sell, setSell] = useState(false);
  const [offset, setOffset] = useState(0);
  const subs = useList("/api/r/subscriptions", { limit: 10, offset });
  const mgr = me.data?.role === "manager";
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={() => setSell(true)}>Sell package</Button></div>
      <ResourcePage resource="packages" title="Packages" canEdit={mgr} canDelete newLabel="New package" subtitle="Prepaid bundles of services."
        columns={[{ key: "n", header: "Package", render: (r) => <b>{r.name}</b> }, { key: "p", header: "Price", render: (r) => money(r.price) }, { key: "v", header: "Validity", render: (r) => `${r.validity_days} days` },
          { key: "l", header: "Includes", hideOnMobile: true, render: (r) => r.lines.map((l: any) => `${l.service} ×${l.qty}`).join(", ") }]}
        fields={[{ name: "name", label: "Name", required: true }, { name: "price", label: "Price", type: "number", required: true }, { name: "validity_days", label: "Validity (days)", type: "number", required: true },
          { name: "lines", label: "Included services (quantity each)", type: "lines", options: cfg.data?.services.map((s) => ({ value: s.id, label: s.name })) }]}
        fromRow={(r) => ({ name: r.name, price: r.price, validity_days: r.validity_days, lines: r.lines?.map((l: any) => ({ service_id: l.service_id, qty: l.qty })) ?? [] })} />
      <section>
        <h2 className="mb-2 text-lg font-bold">Active & past subscriptions</h2>
        <div className="space-y-2">{subs.data?.items.map((s: any) => (
          <Card key={s.id} className="text-sm"><div className="flex justify-between"><b>{s.partner_id?.name} · {s.package_id?.name}</b><StatusBadge status={s.expired ? "expired" : "active"} /></div>
            <p className="text-muted">{fmtDate(s.start_date)} → {fmtDate(s.expiry_date)} · {money(s.amount)}</p><p>{s.lines.map((l: any) => `${l.service}: ${l.remaining}/${l.total}`).join(" · ")}</p></Card>))}
          {subs.data && subs.data.items.length === 0 && <p className="text-sm text-muted">No packages sold yet.</p>}
          {subs.data && subs.data.total > offset + 10 && <Button variant="secondary" onClick={() => setOffset(offset + 10)}>Next</Button>}</div>
      </section>
      <SellModal open={sell} onClose={() => setSell(false)} packages={cfg.data?.packages ?? []} />
    </div>
  );
}
void PageHeader;

function SellModal({ open, onClose, packages }: { open: boolean; onClose: () => void; packages: { id: number; name: string; price: number }[] }) {
  const [q, setQ] = useState(""), [cust, setCust] = useState<any>(null), [pkg, setPkg] = useState(""), [method, setMethod] = useState("cash");
  const dq = useDebounced(q);
  const found = useQuery({ queryKey: ["cs", dq], enabled: dq.length >= 2 && !cust, queryFn: () => api.get<any>(`/api/r/customers?search=${encodeURIComponent(dq)}&limit=5`) });
  const sellM = useAction(() => api.post("/api/packages/sell", { partnerId: cust.id, packageId: Number(pkg), method }), { success: "Package sold", invalidate: [["list"]], onSuccess: () => { setCust(null); setQ(""); setPkg(""); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Sell package">
      <div className="space-y-3">
        <Field label="Customer">{cust ? <div className="flex justify-between rounded-xl border border-line p-2 text-sm font-semibold">{cust.name}<button className="text-brand-600" onClick={() => setCust(null)}>Change</button></div> : <div><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or mobile…" />{found.data?.items.map((c: any) => <button key={c.id} onClick={() => setCust(c)} className="mt-1 block w-full rounded-xl border border-line p-2 text-left text-sm">{c.name} · {c.otm_cw_mobile}</button>)}</div>}</Field>
        <Field label="Package"><Select value={pkg} onChange={(e) => setPkg(e.target.value)}><option value="">Select…</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}</Select></Field>
        <Field label="Payment method"><Select value={method} onChange={(e) => setMethod(e.target.value)}>{["cash", "upi", "card", "online"].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}</Select></Field>
        <Button className="w-full" size="lg" disabled={!cust || !pkg} loading={sellM.isPending} onClick={() => sellM.mutate()}>Sell & record payment</Button>
      </div>
    </Modal>
  );
}
