"use client";
import { useRouter } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useGet } from "@/lib/client/hooks";
import Link from "next/link";

export default function Book() {
  const router = useRouter();
  const q = useGet<any>(["portal-vehicles"], "/api/portal/r/vehicles?limit=50");
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingState />;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Book a wash" subtitle="Pick your vehicle, services and a time. You'll see the price before you confirm." />
      {q.data.items.length === 0 ? <Card className="text-sm">Add a vehicle first. <Link className="font-semibold text-brand-600 underline" href="/portal/vehicles">Add vehicle</Link></Card> : <BookingForm portal vehicles={q.data.items} onDone={() => router.push("/portal/bookings")} />}
    </div>
  );
}
