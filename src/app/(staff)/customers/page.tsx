"use client";
import { ResourcePage } from "@/components/crud";
import { fmtDate, money } from "@/lib/format";
import { StatusBadge } from "@/components/status";

const TYPES = ["standard", "vip", "corporate", "membership"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
export default function Customers() {
  return (
    <ResourcePage resource="customers" title="Customers" newLabel="Add customer" searchPlaceholder="Name or mobile…" href={(r) => `/customers/${r.id}`}
      columns={[
        { key: "name", header: "Customer", render: (r) => <b>{r.name}</b> }, { key: "mobile", header: "Mobile", render: (r) => r.otm_cw_mobile },
        { key: "type", header: "Type", render: (r) => <StatusBadge status={r.otm_cw_customer_type || "standard"} /> },
        { key: "veh", header: "Vehicles", hideOnMobile: true, render: (r) => r.vehicle_count ?? 0 },
        { key: "visits", header: "Visits", hideOnMobile: true, render: (r) => r.visits ?? 0 },
        { key: "rev", header: "Spent", render: (r) => money(r.revenue) }, { key: "last", header: "Last visit", hideOnMobile: true, render: (r) => fmtDate(r.last_visit) },
      ]}
      fields={[
        { name: "name", label: "Name", required: true }, { name: "otm_cw_mobile", label: "Mobile", type: "tel", required: true },
        { name: "otm_cw_whatsapp", label: "WhatsApp", type: "tel" }, { name: "email", label: "Email" },
        { name: "otm_cw_customer_type", label: "Customer type", type: "select", options: TYPES }, { name: "otm_cw_discount", label: "Discount %", type: "number" },
        { name: "otm_cw_notify_channel", label: "Update channel", type: "select", options: ["auto", "whatsapp", "telegram", "sms", "email", "all", "none"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) },
        { name: "otm_cw_telegram_chat_id", label: "Telegram chat id", hint: "Auto-filled when the customer connects" },
        { name: "street", label: "Address", span2: true },
      ]} />
  );
}
