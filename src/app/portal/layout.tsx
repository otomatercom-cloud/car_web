import { redirect } from "next/navigation";
import { PortalShell } from "@/components/shell";
import { readSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.role !== "customer") redirect("/dashboard");
  return <PortalShell name={s.name}>{children}</PortalShell>;
}
