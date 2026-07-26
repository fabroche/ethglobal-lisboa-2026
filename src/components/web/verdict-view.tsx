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
 *
 * Owns one piece of state the panel needs but cannot compute: whether the deadline has passed
 * (S3.19). Before it does, nothing is running and the countdown is the honest indicator; after
 * it does, the lazy reveal is genuinely working and the panel shows a spinner.
 */
export function VerdictView({
  deadlineIso,
  initialVerdict,
  pollVerdict,
  pollMs = 5000,
  className,
}: VerdictViewProps) {
  const [verdict, setVerdict] = useState<Verdict | null>(initialVerdict);
  // `null` until the client has a clock. The server has no business guessing "now" — and
  // rendering a spinner on the server that the client then removes is a hydration mismatch.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (verdict || !pollVerdict) return;
    let active = true;
    // S3.21(a): a self-rescheduling timeout, NOT setInterval. The poll triggers the lazy
    // reveal server-side, which takes far longer than pollMs (enclave call + attestation +
    // topic write) — an interval fires again mid-flight and stacks concurrent reveals.
    // The next poll is armed only after the previous one has fully returned.
    let id: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let next: Awaited<ReturnType<typeof pollVerdict>> = null;
      try {
        next = await pollVerdict();
      } catch {
        // Transient network failure — keep polling; stopping would strand the screen.
      }
      if (!active) return;
      if (next) setVerdict(next);
      else id = setTimeout(poll, pollMs);
    };
    id = setTimeout(poll, pollMs);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [verdict, pollVerdict, pollMs]);

  // Ticks only while it still matters: once a verdict is in, or with no deadline to watch,
  // there is nothing for this timer to change.
  useEffect(() => {
    if (verdict || !deadlineIso) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [verdict, deadlineIso]);

  const deadlineReached =
    deadlineIso === undefined || nowMs === null
      ? undefined
      : nowMs >= new Date(deadlineIso).getTime();

  return (
    <div className={className}>
      {deadlineIso ? <Countdown deadlineIso={deadlineIso} className="mb-6" /> : null}
      <VerdictPanel verdict={verdict} deadlineReached={deadlineReached} />
    </div>
  );
}
