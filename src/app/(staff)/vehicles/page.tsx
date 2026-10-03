"use client";
import { ResourcePage } from "@/components/crud";
import { useStatic } from "@/lib/client/hooks";
import { fmtDate } from "@/lib/format";

export default function Vehicles() {
  const cfg = useStatic();
  return (
    <ResourcePage resource="vehicles" title="Vehicles" newLabel="Add vehicle" searchPlaceholder="Registration number…" href={(r) => `/vehicles/${r.id}`}
      columns={[
        { key: "reg", header: "Vehicle no.", render: (r) => <b className="tracking-wide">{r.reg_no}</b> }, { key: "type", header: "Type", render: (r) => r.vehicle_type_id?.name },
        { key: "car", header: "Make / model", hideOnMobile: true, render: (r) => [r.brand, r.model, r.color].filter(Boolean).join(" ") || "—" },
        { key: "owner", header: "Owner", render: (r) => r.partner_id?.name }, { key: "w", header: "Washes", hideOnMobile: true, render: (r) => r.total_washes ?? 0 },
        { key: "l", header: "Last wash", hideOnMobile: true, render: (r) => fmtDate(r.last_wash) },
      ]}
      fields={[
        { name: "reg_no", label: "Registration number", required: true },
        { name: "vehicle_type_id", label: "Vehicle type", type: "select", required: true, options: cfg.data?.vehicle_types.map((t) => ({ value: t.id, label: t.name })) },
        { name: "partner_id", label: "Owner (customer ID)", type: "number", required: true, hint: "Tip: add vehicles from the customer's page or via Walk-in." },
        { name: "brand", label: "Brand" }, { name: "model", label: "Model" }, { name: "color", label: "Colour" }, { name: "notes", label: "Notes", type: "textarea" },
      ]} />
  );
}
