"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, Select } from "./ui";
import { money } from "@/lib/format";
import type { StaticConfig } from "@/lib/types";

const CT = ["standard", "vip", "corporate", "membership"] as const;
type Cell = { service_id: number; vehicle_type_id: number; customer_type: string; price: number | null };

/** Service × Vehicle-type price grid. Managers edit inline; blank = no price (service unavailable for that type). */
export function PricingMatrix({ config, editable, saving, onSave }: {
  config: StaticConfig; editable?: boolean; saving?: boolean; onSave?: (cells: Cell[]) => void;
}) {
  const [ctype, setCtype] = useState<(typeof CT)[number]>("standard");
  const base = useMemo(() => {
    const m = new Map<string, number>();
    config.pricing.filter((p) => p.customer_type === ctype).forEach((p) => m.set(`${p.service_id}:${p.vehicle_type_id}`, p.price));
    return m;
  }, [config.pricing, ctype]);
  const std = useMemo(() => {
    const m = new Map<string, number>();
    config.pricing.filter((p) => p.customer_type === "standard").forEach((p) => m.set(`${p.service_id}:${p.vehicle_type_id}`, p.price));
    return m;
  }, [config.pricing]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  useEffect(() => setEdits({}), [ctype, config.pricing]);

  const dirty = Object.keys(edits).length;
  const save = () =>
    onSave?.(Object.entries(edits).map(([k, v]) => {
      const [s, t] = k.split(":").map(Number);
      return { service_id: s, vehicle_type_id: t, customer_type: ctype, price: v === "" ? null : Number(v) };
    }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Select value={ctype} onChange={(e) => setCtype(e.target.value as (typeof CT)[number])} className="w-52 capitalize">
          {CT.map((c) => <option key={c} value={c}>{c} pricing</option>)}
        </Select>
        {ctype !== "standard" && <p className="text-xs text-muted">Blank cells fall back to the Standard price.</p>}
        {editable && <Button onClick={save} disabled={!dirty} loading={saving}>Save {dirty ? `${dirty} change${dirty > 1 ? "s" : ""}` : ""}</Button>}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Service</th>
              {config.vehicle_types.map((v) => <th key={v.id} className="px-3 py-3 text-right">{v.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {config.services.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-semibold">{s.name}<span className="block text-xs font-normal text-muted">{s.duration} min</span></td>
                {config.vehicle_types.map((v) => {
                  const k = `${s.id}:${v.id}`;
                  const val = k in edits ? edits[k] : base.has(k) ? String(base.get(k)) : "";
                  return (
                    <td key={v.id} className="px-2 py-1.5 text-right">
                      {editable ? (
                        <input
                          inputMode="decimal" value={val} placeholder={ctype !== "standard" && std.has(k) ? String(std.get(k)) : "—"}
                          onChange={(e) => setEdits((p) => ({ ...p, [k]: e.target.value.replace(/[^\d.]/g, "") }))}
                          className="h-9 w-24 rounded-lg border border-line bg-surface px-2 text-right tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          aria-label={`${s.name} ${v.name}`}
                        />
                      ) : (
                        <span className="tabular-nums">{base.has(k) ? money(base.get(k)) : std.has(k) && ctype !== "standard" ? <span className="text-muted">{money(std.get(k))}</span> : "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
