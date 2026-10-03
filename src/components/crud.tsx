"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DataTable, type Column } from "./data-table";
import { Button, ConfirmDialog, Field, FilterBar, Input, Modal, PageHeader, SearchBar, Select, Textarea } from "./ui";
import { api } from "@/lib/client/api";
import { useAction, useDebounced, useList } from "@/lib/client/hooks";

export interface FieldDef {
  name: string; label: string; type?: "text" | "number" | "select" | "textarea" | "checkbox" | "multi" | "tel" | "lines";
  options?: { value: string | number; label: string }[]; required?: boolean; hint?: string; span2?: boolean;
}

/** Reusable server-paginated list + create/edit modal over /api/r/:resource. */
export function ResourcePage({ resource, title, subtitle, columns, fields, searchPlaceholder, href, canEdit = true, canDelete = false, toValues, fromRow, extraFilters, newLabel = "Add", filters: baseFilters }: {
  resource: string; title: string; subtitle?: string; columns: Column<any>[]; fields: FieldDef[]; searchPlaceholder?: string;
  href?: (row: any) => string | null; canEdit?: boolean; canDelete?: boolean; newLabel?: string;
  toValues?: (form: Record<string, any>) => Record<string, any>; fromRow?: (row: any) => Record<string, any>;
  extraFilters?: ReactNode; filters?: Record<string, string | number | undefined>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(""), [offset, setOffset] = useState(0);
  const [edit, setEdit] = useState<any | null>(null), [del, setDel] = useState<any | null>(null);
  const dq = useDebounced(q);
  const LIMIT = 25;
  const list = useList(`/api/r/${resource}`, { search: dq, offset, limit: LIMIT, filters: baseFilters });
  const save = useAction((f: Record<string, any>) => {
    const values = toValues ? toValues(f) : f;
    return edit?.id ? api.put(`/api/r/${resource}/${edit.id}`, { values }) : api.post(`/api/r/${resource}`, { values });
  }, { success: "Saved", invalidate: [["list"], ["static"]], onSuccess: () => setEdit(null) });
  const remove = useAction((id: number) => api.del(`/api/r/${resource}/${id}`), { success: "Archived", invalidate: [["list"], ["static"]], onSuccess: () => setDel(null) });
  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} actions={canEdit && fields.length > 0 ? <Button onClick={() => setEdit({})}><Plus className="size-4" />{newLabel}</Button> : undefined} />
      <FilterBar><SearchBar value={q} onChange={(v) => { setQ(v); setOffset(0); }} placeholder={searchPlaceholder} />{extraFilters}</FilterBar>
      <DataTable columns={columns} rows={list.data?.items} total={list.data?.total} offset={offset} limit={LIMIT} onPage={setOffset}
        loading={list.isLoading} error={list.isError} onRetry={() => list.refetch()}
        onRowClick={(r) => { const h = href?.(r); if (h) router.push(h); else if (canEdit && fields.length) setEdit(r); }}
        empty={{ title: `No ${title.toLowerCase()} yet`, action: canEdit && fields.length ? <Button onClick={() => setEdit({})}>{newLabel}</Button> : undefined }} />
      {edit && <EditModal key={edit.id ?? "new"} row={edit} fields={fields} fromRow={fromRow} saving={save.isPending} title={edit.id ? `Edit ${title}` : newLabel}
        onClose={() => setEdit(null)} onSave={(f) => save.mutate(f)} onDelete={canDelete && edit.id ? () => { setDel(edit); } : undefined} />}
      <ConfirmDialog open={!!del} danger title="Archive this record?" message="It will be hidden from lists but history is kept." confirmLabel="Archive" loading={remove.isPending}
        onClose={() => setDel(null)} onConfirm={() => { remove.mutate(del.id); setEdit(null); }} />
    </div>
  );
}

function EditModal({ row, fields, fromRow, saving, title, onClose, onSave, onDelete }: {
  row: any; fields: FieldDef[]; fromRow?: (r: any) => Record<string, any>; saving: boolean; title: string; onClose: () => void; onSave: (f: Record<string, any>) => void; onDelete?: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>(() => (fromRow ? fromRow(row) : row.id ? Object.fromEntries(fields.map((x) => { const v = row[x.name]; return [x.name, Array.isArray(v) ? v.map((i: any) => i.id ?? i) : v && typeof v === "object" ? v.id : v]; })) : {}));
  const [err, setErr] = useState("");
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const submit = () => {
    const miss = fields.find((x) => x.required && (f[x.name] === undefined || f[x.name] === "" || f[x.name] === null));
    if (miss) return setErr(`${miss.label} is required`);
    setErr(""); onSave(f);
  };
  return (
    <Modal open onClose={onClose} title={title} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((x) => (
          <Field key={x.name} label={x.label} hint={x.hint} className={x.span2 || x.type === "textarea" || x.type === "multi" || x.type === "lines" ? "sm:col-span-2" : ""}>
            {x.type === "select" ? <Select value={f[x.name] ?? ""} onChange={(e) => set(x.name, e.target.value)}><option value="">—</option>{x.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
              : x.type === "textarea" ? <Textarea value={f[x.name] ?? ""} onChange={(e) => set(x.name, e.target.value)} />
              : x.type === "checkbox" ? <input type="checkbox" className="size-6" checked={!!f[x.name]} onChange={(e) => set(x.name, e.target.checked)} />
              : x.type === "lines" ? <div className="space-y-1">{x.options?.map((o) => { const cur: { service_id: number; qty: number }[] = f[x.name] ?? []; const row = cur.find((l) => l.service_id === Number(o.value)); return <div key={o.value} className="flex items-center justify-between gap-2 text-sm"><span>{o.label}</span><Input type="number" min={0} className="w-20" value={row?.qty ?? ""} placeholder="0" onChange={(e) => { const q = Number(e.target.value); const rest = cur.filter((l) => l.service_id !== Number(o.value)); set(x.name, q > 0 ? [...rest, { service_id: Number(o.value), qty: q }] : rest); }} /></div>; })}</div>
              : x.type === "multi" ? <div className="flex flex-wrap gap-2">{x.options?.map((o) => { const cur: number[] = f[x.name] ?? []; const on = cur.includes(Number(o.value)); return <button type="button" key={o.value} onClick={() => set(x.name, on ? cur.filter((i) => i !== Number(o.value)) : [...cur, Number(o.value)])} className={`rounded-full border px-3 py-1 text-sm ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line"}`}>{o.label}</button>; })}</div>
              : <Input type={x.type === "number" ? "number" : x.type === "tel" ? "tel" : "text"} value={f[x.name] ?? ""} onChange={(e) => set(x.name, x.type === "number" ? e.target.value : e.target.value)} />}
          </Field>
        ))}
      </div>
      {err && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{err}</p>}
      <div className="mt-5 flex justify-between gap-2">
        <div>{onDelete && <Button variant="ghost" className="text-red-600" onClick={onDelete}>Archive</Button>}</div>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={submit}>Save</Button></div>
      </div>
    </Modal>
  );
}
