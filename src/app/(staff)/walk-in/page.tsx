"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Field, Input, LoadingState, PageHeader, Select, Textarea, cn } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useDebounced, useStatic } from "@/lib/client/hooks";
import { mins, money } from "@/lib/format";
import { walkInSchema } from "@/lib/schemas";
import type { JobCard, Quote } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

type V = z.input<typeof walkInSchema>;
interface Lookup { vehicle: any; customer: any; subscriptions?: { id: number; name: string; package: string; lines: { service_id: number; service: string; remaining: number }[] }[] }

export default function WalkIn() {
  const cfg = useStatic();
  const [done, setDone] = useState<JobCard | null>(null);
  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<V>({
    resolver: zodResolver(walkInSchema), defaultValues: { serviceIds: [], priority: "normal", name: "", mobile: "", regNo: "", brand: "", model: "", color: "", notes: "", notifyOptIn: true },
  });
  const reg = useDebounced(watch("regNo") ?? "", 400), mobile = useDebounced(watch("mobile") ?? "", 400);
  const vt = watch("vehicleTypeId"), svcIds = (watch("serviceIds") ?? []) as number[], sub = watch("subscriptionId");
  const lk = useQuery({
    queryKey: ["lookup", reg, mobile], enabled: reg.replace(/\W/g, "").length >= 4 || mobile.replace(/\D/g, "").length >= 10,
    queryFn: () => api.get<Lookup>(`/api/lookup?reg=${encodeURIComponent(reg)}&mobile=${encodeURIComponent(mobile)}`),
  });
  const known = lk.data;
  useEffect(() => {
    if (known?.vehicle) { setValue("vehicleTypeId", known.vehicle.vehicle_type_id?.id); }
    if (known?.customer && !watch("name")) setValue("name", known.customer.name);
    if (known?.customer?.otm_cw_mobile && !watch("mobile")) setValue("mobile", known.customer.otm_cw_mobile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known]);
  const quote = useQuery({
    queryKey: ["quote", vt, svcIds, known?.customer?.id], enabled: !!vt && svcIds.length > 0,
    queryFn: () => api.post<Quote>("/api/quote", { vehicleTypeId: vt, serviceIds: svcIds, partnerId: known?.customer?.id ?? null }),
  });
  const create = useAction((v: V) => api.post<JobCard>("/api/walk-in", v), { success: "Vehicle added to queue", invalidate: [["operations"]], onSuccess: (j) => setDone(j) });
  const toggle = (id: number, cur: number[]) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const usable = useMemo(() => known?.subscriptions?.filter((s) => s.lines.some((l) => svcIds.includes(l.service_id))) ?? [], [known, svcIds]);

  if (!cfg.data) return <LoadingState />;
  if (done) return (
    <Card className="mx-auto max-w-md space-y-3 text-center">
      <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
      <p className="text-sm font-semibold text-muted">Token number</p>
      <p className="text-7xl font-extrabold text-brand-700">{done.token}</p>
      <p className="text-lg font-bold">{done.vehicle.reg_no}</p>
      <p className="text-sm">{done.bay ? `Assigned to ${done.bay.name}` : done.queue_position ? `#${done.queue_position} in the queue` : "In queue"}</p>
      <p className="text-sm text-muted">Estimated {mins(done.estimated_minutes)} · Total {money(done.amount_total)}</p>
      <div className="flex gap-2"><Button className="flex-1" size="lg" onClick={() => { setDone(null); reset(); }}>Next vehicle</Button><Link className="flex-1" href={`/jobs/${done.id}`}><Button variant="secondary" size="lg" className="w-full">Job card</Button></Link></div>
    </Card>
  );
  return (
    <form onSubmit={handleSubmit((v) => create.mutate(v))} className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Walk-in" subtitle="Registration number first — returning customers fill themselves in." />
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Vehicle number" error={errors.regNo?.message}><Input autoFocus autoCapitalize="characters" className="text-lg font-bold uppercase" placeholder="KA01AB1234" {...register("regNo")} /></Field>
          <Field label="Mobile" error={errors.mobile?.message}><Input inputMode="tel" placeholder="98765 43210" {...register("mobile")} /></Field>
          <Field label="Customer name" error={errors.name?.message} hint={known?.customer ? "Existing customer" : "Needed for new customers"}><Input {...register("name")} /></Field>
          <Field label="Vehicle type" error={errors.vehicleTypeId?.message}>
            <Select {...register("vehicleTypeId")} disabled={!!known?.vehicle}><option value="">Select…</option>{cfg.data.vehicle_types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          </Field>
        </div>
        {lk.isFetching && <p className="flex items-center gap-2 text-xs text-muted"><Search className="size-3" />Looking up…</p>}
        {known?.vehicle && <p className="rounded-xl bg-emerald-50 p-2 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">Returning vehicle: {known.vehicle.brand} {known.vehicle.model} {known.vehicle.color} · {known.customer?.name}</p>}
        {!known?.vehicle && <div className="grid grid-cols-3 gap-2"><Input placeholder="Brand" {...register("brand")} /><Input placeholder="Model" {...register("model")} /><Input placeholder="Colour" {...register("color")} /></div>}
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">Services</h2>
        {errors.serviceIds && <p role="alert" className="mb-2 text-sm text-red-600">{errors.serviceIds.message}</p>}
        <Controller control={control} name="serviceIds" render={({ field }) => (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cfg.data!.services.map((s) => {
              const on = (field.value as number[]).includes(s.id);
              const missing = quote.data?.missing?.includes(s.name);
              return <button type="button" key={s.id} onClick={() => field.onChange(toggle(s.id, field.value as number[]))}
                className={cn("rounded-2xl border-2 p-3 text-left transition", on ? "border-brand-600 bg-brand-50 dark:bg-brand-500/15" : "border-line bg-surface hover:border-brand-300")}>
                <span className="block font-semibold">{s.name}</span><span className="text-xs text-muted">{s.duration} min</span>
                {missing && <span className="block text-xs font-medium text-red-600">No price for this vehicle</span>}
              </button>;
            })}
          </div>
        )} />
        {usable.length > 0 && (
          <Field label="Use package credit" className="mt-3"><Select value={sub ?? ""} onChange={(e) => setValue("subscriptionId", e.target.value ? Number(e.target.value) : null)}><option value="">No — pay normally</option>{usable.map((s) => <option key={s.id} value={s.id}>{s.package} ({s.lines.map((l) => `${l.service} ×${l.remaining}`).join(", ")})</option>)}</Select></Field>
        )}
      </Card>
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Priority"><Select {...register("priority")}><option value="normal">Normal</option><option value="priority">Priority</option><option value="vip">VIP</option></Select></Field>
          <Field label="Notes"><Textarea rows={1} {...register("notes")} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5" {...register("notifyOptIn")} />Customer agrees to WhatsApp / Telegram / SMS updates</label>
        <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
          <div><p className="text-xs text-muted">Estimated {quote.data ? mins(quote.data.minutes) : "—"}{quote.data && quote.data.discount > 0 ? ` · discount ${money(quote.data.discount)}` : ""}</p><p className="text-2xl font-extrabold">{quote.data ? money(quote.data.total) : "—"}</p></div>
          <Button type="submit" size="xl" loading={create.isPending} disabled={!!quote.data?.missing?.length}>Add to queue</Button>
        </div>
      </Card>
    </form>
  );
}
