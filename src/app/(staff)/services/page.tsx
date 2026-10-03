"use client";
import { ResourcePage } from "@/components/crud";
import { StatusBadge } from "@/components/status";
import { useState } from "react";
import { Button } from "@/components/ui";

export default function Services() {
  const [tab, setTab] = useState<"services" | "vehicle_types">("services");
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Button variant={tab === "services" ? "primary" : "secondary"} onClick={() => setTab("services")}>Services</Button><Button variant={tab === "vehicle_types" ? "primary" : "secondary"} onClick={() => setTab("vehicle_types")}>Vehicle types</Button></div>
      {tab === "services" ? (
        <ResourcePage key="s" resource="services" title="Services" subtitle="Set prices in the Pricing matrix." canDelete newLabel="Add service"
          columns={[{ key: "name", header: "Service", render: (r) => <b>{r.name}</b> }, { key: "code", header: "Code" }, { key: "duration", header: "Duration", render: (r) => `${r.duration} min` }, { key: "active", header: "Status", render: (r) => <StatusBadge status={r.active ? "active" : "archived"} /> }]}
          fields={[{ name: "name", label: "Name", required: true }, { name: "code", label: "Code", required: true }, { name: "duration", label: "Duration (minutes)", type: "number", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "sequence", label: "Sort order", type: "number" }]} />
      ) : (
        <ResourcePage key="v" resource="vehicle_types" title="Vehicle types" canDelete newLabel="Add vehicle type"
          columns={[{ key: "name", header: "Type", render: (r) => <b>{r.name}</b> }, { key: "code", header: "Code" }, { key: "description", header: "Description", hideOnMobile: true }]}
          fields={[{ name: "name", label: "Name", required: true }, { name: "code", label: "Code", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "sequence", label: "Sort order", type: "number" }]} />
      )}
    </div>
  );
}
