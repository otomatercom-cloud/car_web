"use client";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { Button, Card, ErrorState, Field, Input, LoadingState, Select, Textarea } from "./ui";
import { api } from "@/lib/client/api";
import { useAction, useGet } from "@/lib/client/hooks";

type Cfg = Record<string, any>;
const flag = (v: unknown) => (v === "1" ? "1" : "0");

/** Manager: channel credentials (write-only), per-event on/off + message templates, test sends, Telegram webhook. */
export function NotifySettings() {
  const q = useGet<Cfg>(["notify-settings"], "/api/notify/settings");
  const [f, setF] = useState<Cfg>({});
  const [ev, setEv] = useState<Record<string, Cfg>>({});
  const [test, setTest] = useState<{ channel: string; to: string }>({ channel: "whatsapp", to: "" });
  const save = useAction(() => api.post("/api/notify/settings", { ...f, events: ev }), { success: "Notification settings saved", invalidate: [["notify-settings"]], onSuccess: () => { setF({}); setEv({}); } });
  const send = useAction(() => api.post("/api/notify/test", test), { success: "Test message sent" });
  const hook = useAction(() => api.post("/api/notify/telegram-webhook", {}), { success: "Telegram webhook registered" });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState rows={3} />;
  const d = q.data;
  const v = (k: string) => f[k] ?? d[k] ?? "";
  const set = (k: string, val: unknown) => setF((p) => ({ ...p, [k]: val }));
  const evv = (e: string, k: string) => ev[e]?.[k] ?? d.events[e][k];
  const setE = (e: string, k: string, val: unknown) => setEv((p) => ({ ...p, [e]: { ...p[e], [k]: val } }));
  const dirty = Object.keys(f).length + Object.keys(ev).length > 0;
  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5" checked={flag(v(k)) === "1"} onChange={(e) => set(k, e.target.checked ? "1" : "0")} />{label}</label>
  );
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-bold">Customer notifications</h2>
        <p className="text-sm text-muted">Message customers when their vehicle is assigned to a bay, ready, and more. Active channels: <b>{d.active_channels.length ? d.active_channels.join(", ") : "none yet"}</b>. Keys are stored in Odoo and are never shown again.</p>
      </div>
      <Field label="Shop name (used in messages)"><Input value={v("shop_name")} onChange={(e) => set("shop_name", e.target.value)} placeholder="Shine Car Wash" /></Field>

      <fieldset className="space-y-3 rounded-2xl border border-line p-4">
        <legend className="px-2 font-bold">WhatsApp (Meta Cloud API)</legend>
        <Toggle k="wa_enabled" label="Enable WhatsApp" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone number ID"><Input value={v("wa_phone_id")} onChange={(e) => set("wa_phone_id", e.target.value)} /></Field>
          <Field label="Permanent access token" hint={d.wa_token_set ? "Saved — leave blank to keep" : "Required"}><Input type="password" autoComplete="off" value={f.wa_token ?? ""} placeholder={d.wa_token_set ? "••••••••" : ""} onChange={(e) => set("wa_token", e.target.value)} /></Field>
          <Field label="Default country code" hint="Added to 10-digit numbers"><Input value={f.wa_country ?? d.country_code ?? ""} onChange={(e) => set("wa_country", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Template language"><Input value={v("wa_lang") || "en"} onChange={(e) => set("wa_lang", e.target.value)} /></Field>
        </div>
        <p className="text-xs text-muted">WhatsApp only allows free text inside 24 h of the customer's last message. To start a conversation, create approved templates in Meta with 4 body variables ({"{{1}}"} customer, {"{{2}}"} vehicle, {"{{3}}"} bay, {"{{4}}"} token) and enter each template name below.</p>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-line p-4">
        <legend className="px-2 font-bold">Telegram bot</legend>
        <Toggle k="tg_enabled" label="Enable Telegram" />
        <Field label="Bot token (from @BotFather)" hint={d.tg_token_set ? `Saved${d.tg_bot ? ` — @${d.tg_bot}` : ""}. Leave blank to keep.` : "Required"}><Input type="password" autoComplete="off" value={f.tg_token ?? ""} placeholder={d.tg_token_set ? "••••••••" : ""} onChange={(e) => set("tg_token", e.target.value)} /></Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" loading={hook.isPending} disabled={!d.tg_token_set} onClick={() => hook.mutate()}>Register webhook</Button>
          <span className="text-xs text-muted">Needs <code>NEXT_PUBLIC_APP_URL</code> (https) and <code>TELEGRAM_WEBHOOK_SECRET</code> in the server env. Customers connect from their portal profile or by opening the bot link.</span>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-line p-4">
        <legend className="px-2 font-bold">SMS (Twilio) & Email</legend>
        <Toggle k="sms_enabled" label="Enable SMS" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Account SID"><Input value={v("sms_sid")} onChange={(e) => set("sms_sid", e.target.value)} /></Field>
          <Field label="Auth token" hint={d.sms_token_set ? "Saved" : ""}><Input type="password" autoComplete="off" value={f.sms_token ?? ""} placeholder={d.sms_token_set ? "••••••••" : ""} onChange={(e) => set("sms_token", e.target.value)} /></Field>
          <Field label="From number"><Input value={v("sms_from")} onChange={(e) => set("sms_from", e.target.value)} placeholder="+1555…" /></Field>
        </div>
        <Toggle k="email_enabled" label="Enable Email (uses Odoo's outgoing mail server)" />
      </fieldset>

      <div>
        <h3 className="mb-2 font-bold">What to send</h3>
        <p className="mb-2 text-xs text-muted">Placeholders: {"{customer} {vehicle} {bay} {token} {services} {staff_part} {due_part} {shop}"}</p>
        <div className="space-y-3">
          {Object.entries(d.events as Record<string, Cfg>).map(([e]) => (
            <div key={e} className="rounded-2xl border border-line p-3">
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className="size-5" checked={!!evv(e, "enabled")} onChange={(x) => setE(e, "enabled", x.target.checked)} />{d.event_labels[e]}</label>
              <Textarea className="mt-2" rows={2} value={evv(e, "template")} onChange={(x) => setE(e, "template", x.target.value)} />
              {!!d.wa_phone_id && <Input className="mt-2" placeholder="WhatsApp template name (optional)" value={evv(e, "wa_template")} onChange={(x) => setE(e, "wa_template", x.target.value)} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3"><Button loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}><CheckCircle2 className="size-4" />Save notification settings</Button></div>

      <div className="rounded-2xl bg-surface-2 p-4">
        <h3 className="mb-2 font-bold">Send a test</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select className="sm:w-40" value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value })}><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram (chat id)</option><option value="sms">SMS</option><option value="email">Email</option></Select>
          <Input value={test.to} onChange={(e) => setTest({ ...test, to: e.target.value })} placeholder="Mobile / chat id / email" />
          <Button variant="secondary" loading={send.isPending} disabled={!test.to} onClick={() => send.mutate()}><Send className="size-4" />Send</Button>
        </div>
        <p className="mt-1 text-xs text-muted">Save settings first. Failures show the provider's reason, never your keys.</p>
      </div>
    </Card>
  );
}
