"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ResourcePage } from "@/components/crud";
import { StaffCard } from "@/components/cards";
import { StatusBadge } from "@/components/status";
import { api } from "@/lib/client/api";
import { useStatic } from "@/lib/client/hooks";
import type { StaffPerf } from "@/lib/types";
import { mins, money } from "@/lib/format";
import { Button } from "@/components/ui";

const ROLES = [["washer", "Washer"], ["supervisor", "Supervisor"], ["detailer", "Detailer"], ["cashier", "Cashier"]].map(([value, label]) => ({ value, label }));
export default function Staff() {
  const cfg = useStatic();
  const [view, setView] = useState<"cards" | "list">("cards");
  const perf = useQuery({ queryKey: ["staff-perf"], queryFn: () => api.get<StaffPerf[]>("/api/staff-performance"), refetchInterval: 30_000 });
  const byId = new Map(perf.data?.map((p) => [p.id, p]));
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Button size="sm" variant={view === "cards" ? "primary" : "secondary"} onClick={() => setView("cards")}>Performance (today)</Button><Button size="sm" variant={view === "list" ? "primary" : "secondary"} onClick={() => setView("list")}>Manage</Button></div>
      {view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cfg.data?.staff.map((s) => <StaffCard key={s.id} s={s} perf={byId.get(s.id)} href={`/staff/${s.id}`} />)}</div>
      ) : (
        <ResourcePage resource="staff" title="Staff" newLabel="Add staff" href={(r) => `/staff/${r.id}`}
          columns={[{ key: "n", header: "Name", render: (r) => <b>{r.name}</b> }, { key: "r", header: "Role", render: (r) => r.otm_cw_role }, { key: "sh", header: "Shift", hideOnMobile: true, render: (r) => r.otm_cw_shift || "—" },
            { key: "a", header: "Availability", render: (r) => <StatusBadge status={r.otm_cw_available ? "available" : "offline"} /> }]}
          fields={[{ name: "name", label: "Name", required: true }, { name: "otm_cw_mobile", label: "Mobile", type: "tel" }, { name: "otm_cw_role", label: "Role", type: "select", options: ROLES },
            { name: "otm_cw_shift", label: "Shift (e.g. 08:00–16:00)" }, { name: "otm_cw_available", label: "Available for work", type: "checkbox" },
            { name: "otm_cw_service_ids", label: "Skills / services", type: "multi", options: cfg.data?.services.map((s) => ({ value: s.id, label: s.name })) }]} />
      )}
    </div>
  );
}
void mins; void money;
