"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Pause, Play, Receipt, ShieldCheck, Square, Truck, Undo2, Wrench, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, ConfirmDialog, Field, Input, Modal, Select, Textarea } from "./ui";
import { PriorityBadge, StatusBadge } from "./status";
import { PhotoUploader } from "./photo-uploader";
import { VehicleChip } from "./cards";
import { WashTimer } from "./wash-timer";
import { api } from "@/lib/client/api";
import { useAction, useOperations, useSkew, useStatic } from "@/lib/client/hooks";
import { fmtDateTime, fmtTime, mins, money, STATE_LABEL } from "@/lib/format";
import { JOB_ACTIONS, type Role } from "@/lib/rbac";
import type { Inspection, JobCard } from "@/lib/types";

const SIDES = ["front", "rear", "left", "right"] as const;

export function JobControls({ job, role, big }: { job: JobCard; role: Role; big?: boolean }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | "pay" | "assign" | "cancel" | "before" | "after" | "qcfail" | "start">(null);
  const needsPicker = role === "manager" && job.assigned_staff.length === 0;
  const can = (a: string) => JOB_ACTIONS[role].includes(a);
  const act = useAction(
    (v: { action: string; params?: Record<string, unknown>; msg?: string }) => api.post<JobCard>(`/api/jobs/${job.id}/action`, { action: v.action, params: v.params ?? {} }),
    { invalidate: [["operations"], ["job", String(job.id)], ["list"], ["my-jobs"]], success: undefined },
  );
  const run = (action: string, msg: string, params?: Record<string, unknown>) =>
    act.mutate({ action, params }, { onSuccess: () => { import("sonner").then(({ toast }) => toast.success(msg)); qc.invalidateQueries({ queryKey: ["job", String(job.id)] }); } });
  const sz = big ? "xl" : "lg";
  const s = job.state;
  const busy = act.isPending;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {s === "assigned" && can("start") && <Button size={sz} variant="success" loading={busy} onClick={() => (needsPicker ? setModal("start") : run("start", "Wash started"))} className="sm:col-span-2"><Play className="size-6" />START WASH</Button>}
        {s === "washing" && can("pause") && <Button size={sz} variant="warn" loading={busy} onClick={() => run("pause", "Wash paused")}><Pause className="size-6" />PAUSE</Button>}
        {s === "washing" && can("finish") && <Button size={sz} variant="primary" loading={busy} onClick={() => run("finish", "Wash complete — sent to quality check")}><Square className="size-5" />COMPLETE WASH</Button>}
        {s === "paused" && can("resume") && <Button size={sz} variant="success" loading={busy} onClick={() => run("resume", "Wash resumed")} className="sm:col-span-2"><Play className="size-6" />RESUME</Button>}
        {s === "quality_check" && !job.qc_passed && can("qc_pass") && <Button size={sz} variant="success" loading={busy} onClick={() => run("qc_pass", "Quality check passed")}><ShieldCheck className="size-6" />QUALITY CHECK PASSED</Button>}
        {s === "quality_check" && !job.qc_passed && can("qc_fail") && <Button size={sz} variant="danger" onClick={() => setModal("qcfail")}><Undo2 className="size-5" />NEEDS RE-WASH</Button>}
        {s === "quality_check" && job.qc_passed && can("ready") && <Button size={sz} variant="success" loading={busy} onClick={() => run("ready", "Vehicle marked ready")} className="sm:col-span-2"><CheckCircle2 className="size-6" />MARK READY</Button>}
        {s === "ready" && can("payment") && job.balance > 0 && <Button size={sz} variant="primary" onClick={() => setModal("pay")} className="sm:col-span-2"><Receipt className="size-5" />COLLECT PAYMENT · {money(job.balance)}</Button>}
        {s === "ready" && can("deliver") && <Button size={sz} variant="success" loading={busy} disabled={job.payment_state !== "paid"} onClick={() => run("deliver", "Vehicle delivered")} className="sm:col-span-2"><Truck className="size-6" />{job.payment_state === "paid" ? "DELIVER VEHICLE" : "PAYMENT PENDING"}</Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        {s === "queued" && can("assign") && <Button variant="secondary" onClick={() => setModal("assign")}><Wrench className="size-4" />Assign bay</Button>}
        {s === "assigned" && can("unassign") && <Button variant="secondary" loading={busy} onClick={() => run("unassign", "Returned to queue")}><Undo2 className="size-4" />Back to queue</Button>}
        {["assigned", "washing", "paused", "quality_check"].includes(s) && <Button variant="secondary" onClick={() => setModal("before")}><Camera className="size-4" />Before photos</Button>}
        {["quality_check", "ready", "completed"].includes(s) && <Button variant="secondary" onClick={() => setModal("after")}><Camera className="size-4" />After photos</Button>}
        {["ready", "completed"].includes(s) && job.balance > 0 && can("payment") && s !== "ready" && <Button variant="secondary" onClick={() => setModal("pay")}><Receipt className="size-4" />Take payment</Button>}
        {["ready", "completed"].includes(s) && can("invoice") && !job.invoice && <Button variant="secondary" loading={busy} onClick={() => run("invoice", "Invoice created")}><Receipt className="size-4" />Create invoice</Button>}
        {["queued", "assigned", "paused"].includes(s) && can("cancel") && <Button variant="ghost" className="text-red-600" onClick={() => setModal("cancel")}><XCircle className="size-4" />Cancel job</Button>}
      </div>

      <StartModal open={modal === "start"} onClose={() => setModal(null)} onStart={(ids) => { run("start", "Wash started", { employee_ids: ids }); setModal(null); }} />
      <PayModal job={job} open={modal === "pay"} onClose={() => setModal(null)} />
      <AssignModal job={job} open={modal === "assign"} onClose={() => setModal(null)} onAssign={(bayId) => { run("assign", "Bay assigned", { bay_id: bayId }); setModal(null); }} />
      <InspectionModal job={job} kind="before" open={modal === "before"} onClose={() => setModal(null)} />
      <InspectionModal job={job} kind="after" open={modal === "after"} onClose={() => setModal(null)} />
      <ConfirmDialog open={modal === "cancel"} danger title="Cancel this job?" confirmLabel="Cancel job" loading={busy}
        message={<>Job <b>{job.name}</b> for <b>{job.vehicle.reg_no}</b> will be cancelled and any package credit returned.</>}
        onClose={() => setModal(null)} onConfirm={() => { run("cancel", "Job cancelled", { reason: "Cancelled from app" }); setModal(null); }} />
      <FailModal open={modal === "qcfail"} onClose={() => setModal(null)} onSubmit={(notes) => { run("qc_fail", "Sent back for re-wash", { notes }); setModal(null); }} />
    </div>
  );
}

function StartModal({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: (ids: number[]) => void }) {
  const cfg = useStatic();
  const [sel, setSel] = useState<number[]>([]);
  const staff = (cfg.data?.staff ?? []).filter((x) => x.otm_cw_available);
  return (
    <Modal open={open} onClose={onClose} title="Who is washing this vehicle?">
      {staff.length === 0 ? <p className="text-sm text-muted">No available staff. Add staff or mark someone available under Staff.</p> : (
        <div className="flex flex-wrap gap-2">{staff.map((x) => { const on = sel.includes(x.id); return <button key={x.id} type="button" onClick={() => setSel(on ? sel.filter((i) => i !== x.id) : [...sel, x.id])} className={`rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line"}`}>{x.name}</button>; })}</div>
      )}
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Back</Button><Button variant="success" disabled={!sel.length} onClick={() => onStart(sel)}>Start wash</Button></div>
    </Modal>
  );
}

function FailModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (n: string) => void }) {
  const [n, setN] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Send back for re-wash">
      <Field label="What needs to be redone?"><Textarea value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. rear bumper still dirty" /></Field>
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Back</Button><Button variant="danger" onClick={() => onSubmit(n)}>Re-wash</Button></div>
    </Modal>
  );
}

function PayModal({ job, open, onClose }: { job: JobCard; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");
  const pay = useAction(
    () => api.post(`/api/jobs/${job.id}/payment`, { amount: Number(amount || job.balance), method, reference: ref }),
    { success: "Payment received", invalidate: [["operations"], ["job", String(job.id)], ["list"]], onSuccess: () => { setAmount(""); setRef(""); onClose(); } },
  );
  return (
    <Modal open={open} onClose={onClose} title={`Payment · ${job.name}`}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-surface-2 p-2"><p className="text-xs text-muted">Total</p><b>{money(job.amount_total)}</b></div>
        <div className="rounded-xl bg-surface-2 p-2"><p className="text-xs text-muted">Paid</p><b>{money(job.paid_amount)}</b></div>
        <div className="rounded-xl bg-amber-50 p-2 dark:bg-amber-500/10"><p className="text-xs text-muted">Balance</p><b>{money(job.balance)}</b></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount"><Input inputMode="decimal" value={amount} placeholder={String(job.balance)} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
        <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="online">Online</option></Select></Field>
        <Field label="Reference (optional)" className="col-span-2"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UPI txn id / card slip no." /></Field>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="success" loading={pay.isPending} onClick={() => pay.mutate()}>Record payment</Button></div>
    </Modal>
  );
}

function AssignModal({ job, open, onClose, onAssign }: { job: JobCard; open: boolean; onClose: () => void; onAssign: (bayId: number) => void }) {
  const ops = useOperations();
  const free = (ops.data?.bays ?? []).filter((b) => b.state === "available" && job.eligible_bays.includes(b.number));
  return (
    <Modal open={open} onClose={onClose} title="Assign to a bay">
      {free.length === 0 ? <p className="text-sm text-muted">No eligible bay is free right now. The vehicle stays in the queue and is assigned automatically when one frees up.</p> : (
        <div className="grid grid-cols-2 gap-2">{free.map((b) => <Button key={b.id} variant="secondary" size="lg" onClick={() => onAssign(b.id)}>{b.name}</Button>)}</div>
      )}
    </Modal>
  );
}

function InspectionModal({ job, kind, open, onClose }: { job: JobCard; kind: "before" | "after"; open: boolean; onClose: () => void }) {
  const existing = job.inspections?.find((i) => i.kind === kind);
  const [f, setF] = useState<Record<string, any>>({});
  const v = (k: string, d: any = "") => (k in f ? f[k] : (existing as any)?.[k] ?? d);
  const save = useAction(() => api.post(`/api/jobs/${job.id}/inspection`, { kind, ...f }), {
    success: "Inspection saved", invalidate: [["job", String(job.id)]], onSuccess: () => { setF({}); onClose(); },
  });
  return (
    <Modal open={open} onClose={onClose} title={kind === "before" ? "Vehicle inspection (before wash)" : "After-wash check"} wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SIDES.map((side) => (
          <PhotoUploader key={side} label={side[0].toUpperCase() + side.slice(1)} value={f[`photo_${side}`]}
            existingUrl={existing?.photos?.[side] ? `/api/jobs/${job.id}/photo/${existing.id}/${side}` : null}
            onChange={(d) => setF((p) => ({ ...p, [`photo_${side}`]: d }))} />
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Damage notes"><Textarea value={v("damage_notes")} onChange={(e) => setF((p) => ({ ...p, damage_notes: e.target.value }))} placeholder="Scratches, dents…" /></Field>
        <Field label="Customer notes"><Textarea value={v("customer_notes")} onChange={(e) => setF((p) => ({ ...p, customer_notes: e.target.value }))} /></Field>
        {kind === "before" && <Field label="Accessories left in car" className="sm:col-span-2"><Input value={v("accessories")} onChange={(e) => setF((p) => ({ ...p, accessories: e.target.value }))} placeholder="Mats, phone holder, documents…" /></Field>}
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={!!v("staff_confirmed", false)} onChange={(e) => setF((p) => ({ ...p, staff_confirmed: e.target.checked }))} />Staff confirmed</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={!!v("customer_confirmed", false)} onChange={(e) => setF((p) => ({ ...p, customer_confirmed: e.target.checked }))} />Customer confirmed</label>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Close</Button><Button loading={save.isPending} disabled={!Object.keys(f).length} onClick={() => save.mutate()}>Save inspection</Button></div>
    </Modal>
  );
}

/** Full job card: header, timer, controls, services, payments, inspections, audit. */
export function JobDetailView({ job, role }: { job: JobCard; role: Role }) {
  const skew = useSkew(job.server_now);
  const active = job.state === "washing" || job.state === "paused";
  const timeline: [string, string | null][] = [
    ["Queue entry", job.arrival_dt], ["Bay assigned", job.assigned_dt], ["Wash started", job.start_dt], ["Wash finished", job.end_dt], ["Delivered", job.delivered_dt ?? null],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted">{job.name} · Token {job.token}</p>
              <VehicleChip job={job} />
              <Link href={`/customers/${job.customer.id}`} className="mt-1 block text-sm font-semibold hover:underline">{job.customer.name} · {job.customer.mobile}</Link>
            </div>
            <div className="flex flex-col items-end gap-1"><StatusBadge status={job.state} className="text-sm" /><PriorityBadge priority={job.priority} />{job.bay && <span className="text-sm font-bold">{job.bay.name}</span>}</div>
          </div>
          {(active || job.start_dt) && (
            <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-center">
              <WashTimer job={job} skew={skew} size="xl" showCompare />
            </div>
          )}
          {job.assign_reason && <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200"><b>Why this vehicle/bay:</b> {job.assign_reason}</p>}
          <div className="mt-4"><JobControls job={job} role={role} big /></div>
        </Card>
        <Card>
          <h3 className="mb-2 font-bold">Services</h3>
          <ul className="divide-y divide-line text-sm">
            {job.lines?.map((l, i) => <li key={i} className="flex justify-between py-2"><span>{l.service} <span className="text-muted">· {l.duration} min</span></span><b>{money(l.price)}</b></li>)}
          </ul>
          <div className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(job.subtotal)}</span></div>
            {!!job.discount && <div className="flex justify-between"><span className="text-muted">Discount</span><span>−{money(job.discount)}</span></div>}
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(job.amount_total)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Paid</span><span>{money(job.paid_amount)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Balance</span><span className="flex items-center gap-2"><StatusBadge status={job.payment_state} />{money(job.balance)}</span></div>
            {job.invoice && <div className="flex justify-between"><span className="text-muted">Invoice</span><b>{job.invoice}</b></div>}
          </div>
        </Card>
        {job.payments && job.payments.length > 0 && (
          <Card>
            <h3 className="mb-2 font-bold">Payments</h3>
            <ul className="divide-y divide-line text-sm">
              {job.payments.map((p) => <li key={p.id} className="flex justify-between py-2"><span className="capitalize">{p.kind} · {p.method}{p.reference ? ` · ${p.reference}` : ""}<span className="block text-xs text-muted">{fmtDateTime(p.dt)} · {p.received_by}</span></span><b className={p.kind === "refund" ? "text-red-600" : ""}>{p.kind === "refund" ? "−" : ""}{money(p.amount, true)}</b></li>)}
            </ul>
          </Card>
        )}
      </div>
      <div className="space-y-4">
        <Card>
          <h3 className="mb-2 font-bold">Timeline</h3>
          <ol className="space-y-2 text-sm">
            {timeline.map(([l, t]) => <li key={l} className="flex justify-between"><span className="text-muted">{l}</span><b>{t ? fmtTime(t) : "—"}</b></li>)}
            <li className="flex justify-between border-t border-line pt-2"><span className="text-muted">Waited</span><b>{mins(job.wait_minutes)}</b></li>
            <li className="flex justify-between"><span className="text-muted">Estimated / actual</span><b>{mins(job.estimated_minutes)} / {job.work_seconds ? mins(job.work_seconds / 60) : "—"}</b></li>
            <li className="flex justify-between"><span className="text-muted">Staff</span><b className="text-right">{job.staff.join(", ") || "—"}</b></li>
          </ol>
          {job.qc_notes && <p className="mt-3 rounded-xl bg-violet-50 p-2 text-xs dark:bg-violet-500/10">QC: {job.qc_notes}</p>}
        </Card>
        {job.inspections && job.inspections.length > 0 && <InspectionSummary job={job} items={job.inspections} />}
        {job.audit && (
          <Card>
            <h3 className="mb-2 font-bold">Audit trail</h3>
            <ul className="space-y-2 text-xs">
              {job.audit.map((a) => <li key={a.id}><b>{a.action}</b>{a.detail ? ` — ${a.detail}` : ""}<span className="block text-muted">{a.actor} · {fmtDateTime(a.dt)}</span></li>)}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function InspectionSummary({ job, items }: { job: JobCard; items: Inspection[] }) {
  return (
    <Card>
      <h3 className="mb-2 font-bold">Inspections</h3>
      {items.map((i) => (
        <div key={i.id} className="mb-3 text-sm">
          <p className="font-semibold capitalize">{i.kind} wash {i.staff_confirmed && "· staff ✓"} {i.customer_confirmed && "· customer ✓"}</p>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {(["front", "rear", "left", "right"] as const).map((s) => i.photos[s] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s} src={`/api/jobs/${job.id}/photo/${i.id}/${s}`} alt={s} loading="lazy" className="aspect-square rounded-lg object-cover" />
            ))}
          </div>
          {i.damage_notes && <p className="mt-1 text-xs text-muted">Damage: {i.damage_notes}</p>}
          {i.accessories && <p className="text-xs text-muted">Accessories: {i.accessories}</p>}
        </div>
      ))}
    </Card>
  );
}

export { STATE_LABEL };
