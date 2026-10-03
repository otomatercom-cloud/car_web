"use client";
import { PricingMatrix } from "@/components/pricing-matrix";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAction, useStatic } from "@/lib/client/hooks";

export default function Pricing() {
  const cfg = useStatic();
  const save = useAction((cells: any[]) => api.post("/api/pricing", { cells }), { success: "Prices saved", invalidate: [["static"], ["quote"]] });
  if (cfg.isError) return <ErrorState onRetry={() => cfg.refetch()} />;
  if (!cfg.data) return <LoadingState />;
  return (
    <div className="space-y-4">
      <PageHeader title="Pricing" subtitle="Service × vehicle type. Pick a customer type to set special rates; blank falls back to Standard." />
      <PricingMatrix config={cfg.data} editable saving={save.isPending} onSave={(c) => save.mutate(c)} />
    </div>
  );
}
