"use client";
import Link from "next/link";
import { NavIcon, useLogout } from "@/components/shell";
import { Button, PageHeader } from "@/components/ui";
import { useMe } from "@/lib/client/hooks";
import { navFor } from "@/lib/rbac";

export default function More() {
  const me = useMe();
  const logout = useLogout();
  const items = me.data ? navFor(me.data.role) : [];
  return (
    <div className="space-y-4">
      <PageHeader title="More" />
      <div className="grid grid-cols-2 gap-3">{items.map((n) => <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 font-semibold shadow-sm"><NavIcon name={n.icon} className="size-5 text-brand-600" />{n.label}</Link>)}</div>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => logout()}>Sign out</Button>
    </div>
  );
}
