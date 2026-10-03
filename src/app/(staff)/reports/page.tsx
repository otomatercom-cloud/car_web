"use client";
import Link from "next/link";
import { useState } from "react";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet } from "@/lib/client/hooks";
import { fmtDate, mins, money } from "@/lib/format";

export default function Reports() {
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const q = useGet<any>(["reports", from, to], `/api/reports?date_from=${from}&date_to=${to}`);
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState rows={6} />;
  const d = q.data, c = d.customers;
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Defaults to the last 30 days" actions={<div className="flex gap-2"><input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-2 text-sm" /><input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-2 text-sm" /></div>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-2 font-bold">Services</h3><Tbl head={["Service", "Count", "Revenue", "Avg min"]} rows={d.services.map((s: any) => [s.name, s.count, money(s.revenue), s.avg_duration])} /></Card>
        <Card><h3 className="mb-2 font-bold">Customers</h3><div className="grid grid-cols-2 gap-2 text-sm"><p>Total: <b>{c.total}</b></p><p>New: <b>{c.new}</b></p><p>Returning: <b>{c.returning}</b></p><p>Avg spend: <b>{money(c.avg_spend)}</b></p><p>Avg visits: <b>{c.avg_visits}</b></p></div>
          <h4 className="mb-1 mt-3 text-sm font-bold">Top customers</h4><Tbl head={["Customer", "Visits", "Spent"]} rows={d.top_customers.map((t: any) => [<Link key={t.id} className="underline" href={`/customers/${t.id}`}>{t.name}</Link>, t.visits, money(t.spent)])} /></Card>
        <Card><h3 className="mb-2 font-bold">Bay utilization</h3><Tbl head={["Bay", "Busy", "Utilization"]} rows={d.bay_utilization.map((b: any) => [b.bay, mins(b.busy_minutes), `${b.utilization}%`])} /></Card>
        <Card><h3 className="mb-2 font-bold">Staff performance</h3><Tbl head={["Name", "Vehicles", "Avg job", "Revenue"]} rows={d.staff.map((s: any) => [s.name, s.vehicles_completed, mins(s.avg_job_minutes), money(s.revenue)])} /></Card>
        <Card className="lg:col-span-2"><h3 className="mb-2 font-bold">Inactive customers (60+ days)</h3><Tbl head={["Customer", "Last visit"]} rows={d.inactive_customers.map((i: any) => [<Link key={i.id} className="underline" href={`/customers/${i.id}`}>{i.name}</Link>, fmtDate(i.last_visit)])} /></Card>
      </div>
    </div>
  );
}

function Tbl({ head, rows }: { head: string[]; rows: any[][] }) {
  if (!rows.length) return <p className="text-sm text-muted">No data for this period.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted"><tr>{head.map((h) => <th key={h} className="py-1 pr-3">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="py-2 pr-3">{c}</td>)}</tr>)}</tbody></table></div>;
}
