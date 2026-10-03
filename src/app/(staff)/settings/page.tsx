"use client";
import { useState } from "react";
import { NotifySettings } from "@/components/notify-settings";
import { Button, Card, ConfirmDialog, ErrorState, Field, Input, LoadingState, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";

export default function Settings() {
  const q = useGet<{ settings: Record<string, string>; demo: boolean; refreshMs: number }>(["settings"], "/api/settings");
  const [f, setF] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<null | "seed" | "clear">(null);
  const save = useAction(() => api.post("/api/settings", f), { success: "Settings saved", invalidate: [["settings"], ["static"], ["operations"]], onSuccess: () => setF({}) });
  const demo = useAction((a: "seed" | "clear") => api.post("/api/demo", { action: a }), { success: "Done", invalidate: [["settings"], ["static"], ["operations"], ["list"]], onSuccess: () => setConfirm(null) });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  const v = (k: string) => f[k] ?? q.data.settings[k] ?? "";
  const set = (k: string, val: string) => setF((p) => ({ ...p, [k]: val }));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Settings" />
      <Card className="space-y-3">
        <h2 className="font-bold">Queue & waiting thresholds</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Warning after (min)"><Input type="number" value={v("warn_min")} onChange={(e) => set("warn_min", e.target.value)} /></Field>
          <Field label="Critical after (min)"><Input type="number" value={v("critical_min")} onChange={(e) => set("critical_min", e.target.value)} /></Field>
          <Field label="Queue rule" hint="FIFO is default and always explainable."><Select value={v("priority_mode")} onChange={(e) => set("priority_mode", e.target.value)}><option value="fifo">First come, first served</option><option value="priority">Priority first, then FIFO</option></Select></Field>
          <Field label="Auto-assign free bays"><Select value={v("auto_assign")} onChange={(e) => set("auto_assign", e.target.value)}><option value="1">On</option><option value="0">Off (manual)</option></Select></Field>
          <Field label="Opening hour"><Input type="number" value={v("open_hour")} onChange={(e) => set("open_hour", e.target.value)} /></Field>
          <Field label="Closing hour"><Input type="number" value={v("close_hour")} onChange={(e) => set("close_hour", e.target.value)} /></Field>
          <Field label="Time zone"><Input value={v("tz")} onChange={(e) => set("tz", e.target.value)} /></Field>
          <Field label="Live refresh" hint="Set OPERATIONS_REFRESH_INTERVAL in the server env."><Input disabled value={`${Math.round(q.data.refreshMs / 1000)} s`} /></Field>
        </div>
        <Button loading={save.isPending} disabled={!Object.keys(f).length} onClick={() => save.mutate()}>Save settings</Button>
      </Card>
      <NotifySettings />
      <Card className="space-y-2">
        <h2 className="font-bold">Demo data</h2>
        <p className="text-sm text-muted">Sample staff, customers, vehicles and jobs for training. Clearing removes only demo records — real data is never touched.</p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={q.data.demo} onClick={() => setConfirm("seed")}>Load demo data</Button>
          <Button variant="danger" disabled={!q.data.demo} onClick={() => setConfirm("clear")}>Remove demo data</Button>
        </div>
      </Card>
      <ConfirmDialog open={!!confirm} danger={confirm === "clear"} title={confirm === "seed" ? "Load demo data?" : "Remove demo data?"} message={confirm === "seed" ? "Adds sample records marked as demo." : "All demo records will be deleted."} confirmLabel="Yes" loading={demo.isPending} onClose={() => setConfirm(null)} onConfirm={() => confirm && demo.mutate(confirm)} />
    </div>
  );
}
