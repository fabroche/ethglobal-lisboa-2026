"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/** Format a millisecond remainder as `1d 2h 3m 4s` (drops leading zero units). Never negative. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  if (m || h || d) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export interface CountdownProps {
  deadlineIso: string;
  className?: string;
}

/**
 * M8 `countdown` — live time-to-reveal. The tick starts only after mount (server render shows
 * a placeholder) so there's no hydration mismatch. When the deadline passes it reads "Reveal due".
 */
export function Countdown({ deadlineIso, className }: CountdownProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(deadlineIso).getTime();
  const remaining = nowMs == null ? null : target - nowMs;
  const reached = remaining != null && remaining <= 0;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {reached ? "Reveal due" : "Reveal in"}
      </span>
      <span className="font-mono text-2xl tabular-nums" aria-live="polite">
        {remaining == null ? "—" : reached ? "now" : formatRemaining(remaining)}
      </span>
    </div>
  );
}
