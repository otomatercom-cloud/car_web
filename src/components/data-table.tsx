"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button, cn, EmptyState, ErrorState, LoadingState } from "./ui";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  /** Hide this column on small screens (the row still shows in card layout) */
  hideOnMobile?: boolean;
}

/** Server-paginated table. Desktop = table, mobile = stacked cards (no tiny desktop-only tables). */
export function DataTable<T extends { id: number }>({ columns, rows, total, offset, limit, onPage, loading, error, onRetry, onRowClick, empty }: {
  columns: Column<T>[]; rows?: T[]; total?: number; offset: number; limit: number; onPage: (offset: number) => void;
  loading?: boolean; error?: boolean; onRetry?: () => void; onRowClick?: (row: T) => void; empty?: { title: string; hint?: string; action?: ReactNode };
}) {
  if (error) return <ErrorState onRetry={onRetry} />;
  if (loading && !rows) return <LoadingState />;
  if (!rows?.length) return <EmptyState title={empty?.title ?? "Nothing here yet"} hint={empty?.hint} action={empty?.action} />;
  const t = total ?? rows.length;
  const cell = (c: Column<T>, r: T) => (c.render ? c.render(r) : String((r as any)[c.key] ?? "—"));
  return (
    <div>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>{columns.map((c) => <th key={c.key} className={cn("px-4 py-3 font-semibold", c.className)}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} onClick={() => onRowClick?.(r)} className={cn("transition hover:bg-surface-2", onRowClick && "cursor-pointer")}>
                {columns.map((c) => <td key={c.key} className={cn("px-4 py-3", c.className)}>{cell(c, r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <div key={r.id} onClick={() => onRowClick?.(r)} className="rounded-2xl border border-line bg-surface p-3 shadow-sm active:bg-surface-2">
            {columns.filter((c) => !c.hideOnMobile).map((c, i) => (
              <div key={c.key} className={cn("flex justify-between gap-3 py-0.5 text-sm", i === 0 && "font-semibold")}>
                {i > 0 && <span className="text-muted">{c.header}</span>}
                <span className={cn(i === 0 && "w-full")}>{cell(c, r)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>{offset + 1}–{Math.min(offset + limit, t)} of {t}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - limit))}><ChevronLeft className="size-4" />Prev</Button>
          <Button variant="secondary" size="sm" disabled={offset + limit >= t} onClick={() => onPage(offset + limit)}>Next<ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}
