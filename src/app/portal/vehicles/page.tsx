"use client";
import { useState } from "react";
import { VehicleCard } from "@/components/cards";
import { Button, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useGet, useStatic } from "@/lib/client/hooks";

export default function PortalVehicles() {
  const cfg = useStatic();
  const q = useGet<any>(["portal-vehicles"], "/api/portal/r/vehicles?limit=50");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Record<string, any>>({});
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const add = useAction(() => api.post("/api/portal/vehicles", { values: { ...f, vehicle_type_id: Number(f.vehicle_type_id) } }), { success: "Vehicle added", invalidate: [["portal-vehicles"], ["portal-home"]], onSuccess: () => { setOpen(false); setF({}); } });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="space-y-4">
      <PageHeader title="My vehicles" actions={<Button onClick={() => setOpen(true)}>Add vehicle</Button>} />
      {q.data.items.length === 0 ? <EmptyState title="No vehicles yet" action={<Button onClick={() => setOpen(true)}>Add vehicle</Button>} /> : <div className="grid gap-3 sm:grid-cols-2">{q.data.items.map((v: any) => <VehicleCard key={v.id} v={v} />)}</div>}
      <Modal open={open} onClose={() => setOpen(false)} title="Add vehicle">
        <div className="space-y-3">
          <Field label="Registration number"><Input className="uppercase" value={f.reg_no ?? ""} onChange={(e) => set("reg_no", e.target.value)} /></Field>
          <Field label="Vehicle type"><Select value={f.vehicle_type_id ?? ""} onChange={(e) => set("vehicle_type_id", e.target.value)}><option value="">Select…</option>{cfg.data?.vehicle_types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          <div className="grid grid-cols-3 gap-2"><Input placeholder="Brand" value={f.brand ?? ""} onChange={(e) => set("brand", e.target.value)} /><Input placeholder="Model" value={f.model ?? ""} onChange={(e) => set("model", e.target.value)} /><Input placeholder="Colour" value={f.color ?? ""} onChange={(e) => set("color", e.target.value)} /></div>
          <Button className="w-full" size="lg" disabled={!f.reg_no || !f.vehicle_type_id} loading={add.isPending} onClick={() => add.mutate()}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
