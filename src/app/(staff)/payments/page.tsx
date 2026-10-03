"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status";
import { FilterBar, PageHeader, SearchBar, Select } from "@/components/ui";
import { useDebounced, useList } from "@/lib/client/hooks";
import { fmtDateTime, money } from "@/lib/format";

export default function Payments() {
  const r = useRouter();
  const [q, setQ] = useState(""), [offset, setOffset] = useState(0), [method, setMethod] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState("");
  const dq = useDebounced(q);
  const l = useList("/api/r/payments", { search: dq, offset, limit: 25, filters: { method }, date_from: from, date_to: to });
  return (
    <div className="space-y-4">
      <PageHeader title="Payments" />
      <FilterBar>
        <SearchBar value={q} onChange={(v) => { setQ(v); setOffset(0); }} placeholder="Job or reference…" />
        <Select className="w-36" value={method} onChange={(e) => { setMethod(e.target.value); setOffset(0); }}><option value="">All methods</option>{["cash", "upi", "card", "online"].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}</Select>
        <input type="date" aria-label="From" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm" />
        <input type="date" aria-label="To" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm" />
      </FilterBar>
      <DataTable<any> offset={offset} limit={25} onPage={setOffset} rows={l.data?.items} total={l.data?.total} loading={l.isLoading} error={l.isError} onRetry={() => l.refetch()}
        onRowClick={(p) => p.job_id && r.push(`/jobs/${p.job_id.id}`)} empty={{ title: "No payments found" }}
        columns={[
          { key: "dt", header: "Date", render: (p) => fmtDateTime(p.dt) }, { key: "job", header: "Job", render: (p) => <b>{p.job_id?.name}</b> },
          { key: "c", header: "Customer", hideOnMobile: true, render: (p) => p.partner_id?.name }, { key: "m", header: "Method", render: (p) => <span className="uppercase">{p.method}</span> },
          { key: "k", header: "Type", hideOnMobile: true, render: (p) => <StatusBadge status={p.kind} /> }, { key: "ref", header: "Reference", hideOnMobile: true },
          { key: "a", header: "Amount", render: (p) => <b className={p.kind === "refund" ? "text-red-600" : ""}>{p.kind === "refund" ? "−" : ""}{money(p.amount, true)}</b> },
        ]} />
    </div>
  );
}
