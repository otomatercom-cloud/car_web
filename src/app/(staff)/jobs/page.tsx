"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge, PriorityBadge } from "@/components/status";
import { FilterBar, PageHeader, SearchBar, Select } from "@/components/ui";
import { useDebounced, useList } from "@/lib/client/hooks";
import { fmtDateTime, mins, money } from "@/lib/format";

const LIMIT = 25;
export default function Jobs() {
  const r = useRouter();
  const [q, setQ] = useState(""), [state, setState] = useState(""), [offset, setOffset] = useState(0), [date, setDate] = useState("");
  const dq = useDebounced(q);
  const list = useList("/api/r/jobs", { search: dq, offset, limit: LIMIT, filters: { state }, date_from: date, date_to: date });
  const cols: Column<any>[] = [
    { key: "name", header: "Job", render: (j) => <b>{j.name} <span className="font-normal text-muted">#{j.token}</span></b> },
    { key: "vehicle", header: "Vehicle", render: (j) => j.vehicle_id?.name },
    { key: "customer", header: "Customer", hideOnMobile: true, render: (j) => j.partner_id?.name },
    { key: "state", header: "Status", render: (j) => <StatusBadge status={j.state} /> },
    { key: "priority", header: "Priority", hideOnMobile: true, render: (j) => <PriorityBadge priority={j.priority} /> },
    { key: "arrival", header: "Arrived", hideOnMobile: true, render: (j) => fmtDateTime(j.arrival_dt) },
    { key: "wash", header: "Wash", hideOnMobile: true, render: (j) => (j.work_seconds ? mins(j.work_seconds / 60) : "—") },
    { key: "pay", header: "Payment", render: (j) => <span className="flex items-center gap-2">{money(j.amount_total)} <StatusBadge status={j.payment_state} /></span> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Job Cards" />
      <FilterBar>
        <SearchBar value={q} onChange={(v) => { setQ(v); setOffset(0); }} placeholder="Search job number…" />
        <Select value={state} onChange={(e) => { setState(e.target.value); setOffset(0); }} className="w-44"><option value="">All statuses</option>{["queued", "assigned", "washing", "paused", "quality_check", "ready", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setOffset(0); }} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm" aria-label="Date" />
      </FilterBar>
      <DataTable columns={cols} rows={list.data?.items} total={list.data?.total} offset={offset} limit={LIMIT} onPage={setOffset} loading={list.isLoading} error={list.isError} onRetry={() => list.refetch()} onRowClick={(j) => r.push(`/jobs/${j.id}`)} empty={{ title: "No job cards found" }} />
    </div>
  );
}
