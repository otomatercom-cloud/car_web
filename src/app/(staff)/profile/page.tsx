"use client";
import { PageHeader, Card, Button } from "@/components/ui";
import { useMe } from "@/lib/client/hooks";
import { useLogout } from "@/components/shell";
import { ThemeToggle } from "@/components/shell";

export default function Profile() {
  const me = useMe();
  const logout = useLogout();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader title="Profile" />
      <Card className="space-y-2"><p className="text-lg font-bold">{me.data?.name}</p><p className="text-sm capitalize text-muted">{me.data?.role}</p><div className="flex items-center gap-2 pt-2"><ThemeToggle /><span className="text-sm text-muted">Theme</span></div></Card>
      <Button variant="danger" size="lg" className="w-full" onClick={() => logout()}>Sign out</Button>
    </div>
  );
}
