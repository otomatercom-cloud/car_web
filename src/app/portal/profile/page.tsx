"use client";
import { useState } from "react";
import { Button, Card, ErrorState, Field, Input, LoadingState, PageHeader } from "@/components/ui";
import { PortalNotify } from "@/components/portal-notify";
import { useLogout } from "@/components/shell";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";

export default function PortalProfile() {
  const q = useGet<any>(["portal-home"], "/api/portal/home");
  const logout = useLogout();
  const [f, setF] = useState<Record<string, string>>({});
  const save = useAction(() => api.post("/api/portal/profile", { name: f.name ?? q.data.name, otm_cw_mobile: f.mobile ?? q.data.mobile, otm_cw_whatsapp: f.wa, email: f.email, street: f.street }), { success: "Profile updated", invalidate: [["portal-home"]] });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader title="Profile" />
      <Card className="space-y-3">
        <Field label="Name"><Input defaultValue={q.data.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></Field>
        <Field label="Mobile"><Input defaultValue={q.data.mobile} onChange={(e) => setF((p) => ({ ...p, mobile: e.target.value }))} /></Field>
        <Field label="WhatsApp"><Input onChange={(e) => setF((p) => ({ ...p, wa: e.target.value }))} /></Field>
        <Field label="Email"><Input type="email" onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} /></Field>
        <Field label="Address"><Input onChange={(e) => setF((p) => ({ ...p, street: e.target.value }))} /></Field>
        <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
      </Card>
      <PortalNotify notify={q.data.notify} />
      <Button variant="secondary" className="w-full" onClick={() => logout()}>Sign out</Button>
    </div>
  );
}
