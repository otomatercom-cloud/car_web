import { redirect } from "next/navigation";
import { StaffShell } from "@/components/shell";
import { readSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.role === "customer") redirect("/portal");
  return <StaffShell name={s.name} role={s.role}>{children}</StaffShell>;
}
