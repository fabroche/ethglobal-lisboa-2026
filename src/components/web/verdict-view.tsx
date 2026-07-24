"use client";

import { useState, useEffect } from "react";
import { Countdown } from "./countdown";
import { VerdictPanel } from "./verdict-panel";
import type { Verdict } from "@/session";

export interface VerdictViewProps {
  /** Deadline for the countdown; omitted if the room's expiry isn't readable yet. */
  deadlineIso?: string;
  initialVerdict: Verdict | null;
  /** Re-read the verdict from Mirror Node; polled until a verdict appears. Injected for tests. */
  pollVerdict?: () => Promise<Verdict | null>;
  pollMs?: number;
  className?: string;
}

/**
 * M8 verdict screen body: countdown + the one-line verdict. Polls Mirror Node for the verdict
 * while it's still pending (Mirror lag / reveal not fired), then stops once it lands.
 */
export function VerdictView({
  deadlineIso,
  initialVerdict,
  pollVerdict,
  pollMs = 5000,
  className,
}: VerdictViewProps) {
  const [verdict, setVerdict] = useState<Verdict | null>(initialVerdict);

  useEffect(() => {
    if (verdict || !pollVerdict) return;
    let active = true;
    const id = setInterval(async () => {
      const next = await pollVerdict();
      if (active && next) setVerdict(next);
    }, pollMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [verdict, pollVerdict, pollMs]);

  return (
    <div className={className}>
      {deadlineIso ? <Countdown deadlineIso={deadlineIso} className="mb-6" /> : null}
      <VerdictPanel verdict={verdict} />
    </div>
  );
}
