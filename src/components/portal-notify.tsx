"use client";
import { Send } from "lucide-react";
import { Button, Card, Field, Select } from "./ui";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/hooks";

/** Customer portal: opt-in, preferred channel, Telegram connect. */
export function PortalNotify({ notify }: { notify: any }) {
  const save = useAction((b: Record<string, unknown>) => api.post("/api/portal/profile", b), { success: "Preferences saved", invalidate: [["portal-home"]] });
  const link = useAction(() => api.post<{ link: string }>("/api/portal/telegram-link", {}), { onSuccess: (r) => { window.open(r.link, "_blank", "noopener"); } });
  if (!notify) return null;
  const ch: string[] = notify.channels ?? [];
  return (
    <Card className="space-y-3">
      <h2 className="font-bold">Wash updates</h2>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5" defaultChecked={notify.opt_in} onChange={(e) => save.mutate({ otm_cw_notify_opt_in: e.target.checked })} />Message me when my car is assigned and ready</label>
      <Field label="Preferred channel">
        <Select defaultValue={notify.channel || "auto"} onChange={(e) => save.mutate({ otm_cw_notify_channel: e.target.value })}>
          <option value="auto">Automatic</option>
          {ch.includes("whatsapp") && <option value="whatsapp">WhatsApp</option>}
          {notify.telegram_enabled && <option value="telegram">Telegram</option>}
          {ch.includes("sms") && <option value="sms">SMS</option>}
          {ch.includes("email") && <option value="email">Email</option>}
          <option value="all">All channels</option>
        </Select>
      </Field>
      {notify.telegram_enabled && (notify.telegram_linked
        ? <p className="text-sm font-semibold text-emerald-700">Telegram connected ✓</p>
        : <Button variant="secondary" loading={link.isPending} onClick={() => link.mutate()}><Send className="size-4" />Connect Telegram</Button>)}
    </Card>
  );
}
