"use client";
import { clock, elapsedSeconds, mins } from "@/lib/format";
import { useTick } from "@/lib/client/hooks";
import { cn } from "./ui";
import type { JobCard } from "@/lib/types";

/** Big live timer. Uses server-time skew so a wrong phone clock can't corrupt the display. */
export function WashTimer({ job, skew = 0, size = "md", showCompare }: { job: JobCard; skew?: number; size?: "sm" | "md" | "xl"; showCompare?: boolean }) {
  const running = job.state === "washing";
  useTick(running);
  const sec = elapsedSeconds(job, skew);
  const over = sec > job.estimated_minutes * 60;
  return (
    <div className="inline-flex flex-col">
      <span
        className={cn(
          "font-mono font-bold tabular-nums tracking-tight",
          size === "xl" ? "text-5xl" : size === "md" ? "text-2xl" : "text-base",
          running ? (over ? "text-red-500" : "text-orange-500") : "text-muted",
        )}
      >
        {clock(sec)}
      </span>
      {showCompare && (
        <span className="mt-1 text-xs text-muted">
          Estimated {mins(job.estimated_minutes)} · {job.state === "paused" ? "paused" : over ? "over estimate" : "on track"}
          {!running && job.end_dt ? ` · Actual ${mins(job.work_seconds / 60)}` : ""}
        </span>
      )}
    </div>
  );
}
