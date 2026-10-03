"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Field, Input, Select, Textarea, cn } from "./ui";
import { api } from "@/lib/client/api";
import { useAction, useDebounced, useStatic } from "@/lib/client/hooks";
import { mins, money } from "@/lib/format";
import type { Quote } from "@/lib/types";

/** Booking form used by reception (searches a customer) and by the portal (own vehicles only). */
export function BookingForm({ portal, vehicles, onDone }: { portal?: boolean; vehicles?: any[]; onDone?: (b: any) => void }) {
  const cfg = useStatic();
  const [custQ, setCustQ] = useState(""), [cust, setCust] = useState<any>(null);
  const dq = useDebounced(custQ);
  const found = useQuery({ queryKey: ["cust-search", dq], enabled: !portal && dq.length >= 2 && !cust, queryFn: () => api.get<any>(`/api/r/customers?search=${encodeURIComponent(dq)}&limit=5`) });
  const own = useQuery({ queryKey: ["cust-veh", cust?.id], enabled: !portal && !!cust, queryFn: () => api.get<any>(`/api/r/vehicles?limit=50&f.partner_id=${cust.id}`) });
  const vlist: any[] = portal ? vehicles ?? [] : own.data?.items ?? [];
  const [vehicleId, setVehicleId] = useState(""), [svc, setSvc] = useState<number[]>([]), [slot, setSlot] = useState(""), [notes, setNotes] = useState("");
  const veh = vlist.find((v) => String(v.id) === vehicleId);
  const vtId = veh?.vehicle_type_id?.id;
  const quote = useQuery({
    queryKey: ["bq", portal, vtId, svc, cust?.id], enabled: !!vtId && svc.length > 0,
    queryFn: () => api.post<Quote>(portal ? "/api/portal/quote" : "/api/quote", { vehicleTypeId: vtId, serviceIds: svc, partnerId: cust?.id ?? null }),
  });
  const create = useAction(() => api.post(portal ? "/api/portal/bookings" : "/api/bookings", { partnerId: cust?.id, vehicleId: Number(vehicleId), serviceIds: svc, slot: new Date(slot).toISOString(), notes }),
    { success: "Booking created", invalidate: [["list"], ["portal-home"]], onSuccess: (b) => onDone?.(b) });
  const minSlot = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const ready = vehicleId && svc.length > 0 && slot && !quote.data?.missing?.length && (portal || cust);
  return (
    <div className="space-y-4">
      {!portal && (
        <Field label="Customer">
          {cust ? <div className="flex items-center justify-between rounded-xl border border-line p-2"><span className="font-semibold">{cust.name} · {cust.otm_cw_mobile}</span><Button size="sm" variant="ghost" onClick={() => { setCust(null); setVehicleId(""); }}>Change</Button></div> : (
            <div><Input value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Search name or mobile…" />
              {found.data?.items?.map((c: any) => <button key={c.id} onClick={() => setCust(c)} className="mt-1 block w-full rounded-xl border border-line p-2 text-left text-sm hover:bg-surface-2">{c.name} · {c.otm_cw_mobile}</button>)}</div>)}
        </Field>
      )}
      <Field label="Vehicle"><Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!portal && !cust}><option value="">{vlist.length || portal ? "Select vehicle…" : "No vehicles — add one first"}</option>{vlist.map((v) => <option key={v.id} value={v.id}>{v.reg_no} · {v.vehicle_type_id?.name}</option>)}</Select></Field>
      <div>
        <p className="mb-1 text-sm font-semibold">Services</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{cfg.data?.services.map((s) => { const on = svc.includes(s.id); return <button type="button" key={s.id} onClick={() => setSvc(on ? svc.filter((x) => x !== s.id) : [...svc, s.id])} className={cn("rounded-2xl border-2 p-3 text-left", on ? "border-brand-600 bg-brand-50 dark:bg-brand-500/15" : "border-line")}><b className="block text-sm">{s.name}</b><span className="text-xs text-muted">{s.duration} min</span></button>; })}</div>
      </div>
      <Field label="Date & time"><Input type="datetime-local" min={minSlot} value={slot} onChange={(e) => setSlot(e.target.value)} /></Field>
      <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Card className="flex items-center justify-between bg-surface-2">
        <div><p className="text-xs text-muted">Estimate {quote.data ? `· ${mins(quote.data.minutes)}` : ""}</p><p className="text-2xl font-extrabold">{quote.data ? money(quote.data.total) : "—"}</p>{!!quote.data?.missing?.length && <p className="text-xs text-red-600">No price set for: {quote.data.missing.join(", ")}</p>}</div>
        <Button size="lg" loading={create.isPending} disabled={!ready} onClick={() => create.mutate()}>Book</Button>
      </Card>
    </div>
  );
}
