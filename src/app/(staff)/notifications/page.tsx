"use client";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status";
import { Button, FilterBar, PageHeader, SearchBar, Select } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useDebounced, useList } from "@/lib/client/hooks";
import { fmtDateTime } from "@/lib/format";

const LABEL: Record<string, string> = { vehicle_assigned: "Assigned to bay", wash_started: "Wash started", vehicle_ready: "Ready", delivered: "Delivered", booking_confirmed: "Booking confirmed", vehicle_arrived: "Checked in", payment_received: "Payment", payment_pending: "Balance due", package_expiring: "Package expiring" };

export default function Notifications() {
  const r = useRouter();
  const [q, setQ] = useState(""), [offset, setOffset] = useState(0), [state, setState] = useState(""), [channel, setChannel] = useState("");
  const dq = useDebounced(q);
  const l = useList("/api/r/notifications", { search: dq, offset, limit: 25, filters: { state, channel } }, { refetchMs: 10_000 });
  const retry = useAction((id: number) => api.post(`/api/notifications/${id}/resend`, {}), { success: "Retry queued", invalidate: [["list"]] });
  return (
    <div className="space-y-4">
      <PageHeader title="Customer notifications" subtitle="Every WhatsApp / Telegram / SMS / email the system sent or tried to send." />
      <FilterBar>
        <SearchBar value={q} onChange={(v) => { setQ(v); setOffset(0); }} placeholder="Customer, number or text…" />
        <Select className="w-36" value={state} onChange={(e) => { setState(e.target.value); setOffset(0); }}><option value="">All status</option>{["sent", "pending", "failed", "skipped"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <Select className="w-36" value={channel} onChange={(e) => { setChannel(e.target.value); setOffset(0); }}><option value="">All channels</option>{["whatsapp", "telegram", "sms", "email"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
      </FilterBar>
      <DataTable<any> offset={offset} limit={25} onPage={setOffset} rows={l.data?.items} total={l.data?.total} loading={l.isLoading} error={l.isError} onRetry={() => l.refetch()}
        onRowClick={(n) => n.job_id && r.push(`/jobs/${n.job_id.id}`)} empty={{ title: "No notifications yet", hint: "Configure channels under Settings → Customer notifications." }}
        columns={[
          { key: "dt", header: "When", render: (n) => fmtDateTime(n.create_date) },
          { key: "c", header: "Customer", render: (n) => <b>{n.partner_id?.name}</b> },
          { key: "e", header: "Event", render: (n) => LABEL[n.event] ?? n.event },
          { key: "ch", header: "Channel", render: (n) => <span className="capitalize">{n.channel}</span> },
          { key: "m", header: "Message", hideOnMobile: true, render: (n) => <span className="line-clamp-2 max-w-md text-xs">{n.message}</span> },
          { key: "s", header: "Status", render: (n) => <span className="flex flex-col items-start gap-1"><StatusBadge status={n.state} />{n.error && <span className="max-w-[220px] truncate text-[11px] text-red-600" title={n.error}>{n.error}</span>}</span> },
          { key: "a", header: "", render: (n) => ["failed", "skipped"].includes(n.state) ? <Button size="sm" variant="secondary" loading={retry.isPending} onClick={(e) => { e.stopPropagation(); retry.mutate(n.id); }}><RotateCcw className="size-3.5" />Retry</Button> : null },
        ]} />
    </div>
  );
}
