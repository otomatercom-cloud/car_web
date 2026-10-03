"use client";
import { ErrorBoundaryFallback } from "@/components/ui";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorBoundaryFallback reset={reset} />;
}
