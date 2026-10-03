"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { ResourcePage } from "@/components/crud";
import { StatusBadge } from "@/components/status";
import { Button, Modal, Select } from "@/components/ui";
import { fmtDateTime, money } from "@/lib/format";
import { BOOKING_STATES } from "@/lib/format";

export default function Bookings() {
  const [state, setState] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <>
    <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="size-4" />New booking</Button></div>
    <Modal open={open} onClose={() => setOpen(false)} title="New booking" wide><BookingForm onDone={() => setOpen(false)} /></Modal>
    <ResourcePage resource="bookings" title="Bookings" subtitle="Create bookings from a customer's profile or the customer portal." filters={{ state }} fields={[]} href={(r) => `/bookings/${r.id}`}
      extraFilters={<Select className="w-44" value={state} onChange={(e) => setState(e.target.value)}><option value="">All statuses</option>{BOOKING_STATES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select>}
      columns={[
        { key: "name", header: "Booking", render: (r) => <b>{r.name}</b> }, { key: "slot", header: "Slot", render: (r) => fmtDateTime(r.slot_dt) },
        { key: "c", header: "Customer", render: (r) => r.partner_id?.name }, { key: "v", header: "Vehicle", hideOnMobile: true, render: (r) => r.vehicle_id?.name },
        { key: "s", header: "Status", render: (r) => <StatusBadge status={r.state} /> }, { key: "a", header: "Amount", hideOnMobile: true, render: (r) => money(r.amount_total) },
      ]} />
    </>
  );
}
