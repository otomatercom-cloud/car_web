"use client";
import { useRouter } from "next/navigation";
import { BayCard } from "@/components/cards";
import { ResourcePage } from "@/components/crud";
import { StatusBadge } from "@/components/status";
import { useStatic } from "@/lib/client/hooks";
import { useMe } from "@/lib/client/hooks";

const STATES = ["available", "cleaning", "maintenance", "offline"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
export default function Bays() {
  const cfg = useStatic(), me = useMe(), r = useRouter();
  void BayCard; void r;
  const isMgr = me.data?.role === "manager";
  return (
    <ResourcePage resource="bays" title="Bays" subtitle="Add, rename or take bays out of service. Eligibility limits which vehicles/services a bay accepts." canEdit={isMgr} canDelete newLabel="Add bay" href={(b) => `/bays/${b.id}`}
      columns={[
        { key: "n", header: "Bay", render: (b) => <b>{b.name}</b> }, { key: "s", header: "State", render: (b) => <StatusBadge status={b.state} /> },
        { key: "v", header: "Vehicle types", hideOnMobile: true, render: (b) => b.vehicle_type_ids.map((x: any) => x.name).join(", ") || "All" },
        { key: "sv", header: "Services", hideOnMobile: true, render: (b) => b.service_ids.map((x: any) => x.name).join(", ") || "All" },
        { key: "st", header: "Staff", hideOnMobile: true, render: (b) => b.staff_ids.map((x: any) => x.name).join(", ") || "Any" },
      ]}
      fields={[
        { name: "name", label: "Name", required: true }, { name: "number", label: "Bay number", type: "number", required: true },
        { name: "state", label: "State", type: "select", options: STATES, hint: "Busy/reserved are managed automatically by jobs." },
        { name: "vehicle_type_ids", label: "Allowed vehicle types (none = all)", type: "multi", options: cfg.data?.vehicle_types.map((t) => ({ value: t.id, label: t.name })) },
        { name: "service_ids", label: "Allowed services (none = all)", type: "multi", options: cfg.data?.services.map((t) => ({ value: t.id, label: t.name })) },
        { name: "staff_ids", label: "Assigned staff (none = any)", type: "multi", options: cfg.data?.staff.map((t) => ({ value: t.id, label: t.name })) },
      ]} />
  );
}
