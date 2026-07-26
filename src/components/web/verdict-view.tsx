"use client";

import { useState, useEffect } from "react";
import { Countdown } from "./countdown";
import { VerdictPanel } from "./verdict-panel";
import type { Verdict } from "@/session";

/** A landed verdict and when it was published, as the poll reports it (S3.22). */
export interface VerdictReading {
  verdict: Verdict;
  publishedAt?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Format a verdict's `publishedAt` for display: `26 Jul 2026, 00:14 UTC`.
 *
 * Deliberately UTC, not the viewer's locale: the string renders on the server too, and a
 * timezone-dependent format would hydrate differently than it rendered. UTC also matches the
 * topic's own timestamps, so what the screen says can be checked against the public record.
 */
export function formatRevealedAt(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())} UTC`;
}

export interface VerdictViewProps {
  /** Deadline for the countdown; omitted if the room's expiry isn't readable yet. */
  deadlineIso?: string;
  initialVerdict: Verdict | null;
  /** `publishedAt` of an already-landed verdict, read off the topic (S3.22). */
  publishedAtIso?: string;
  /** Re-read the verdict from Mirror Node; polled until a verdict appears. Injected for tests. */
  pollVerdict?: () => Promise<VerdictReading | null>;
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
 *
 * Once a verdict is in, the countdown goes away (S3.22): a resolved room has nothing due, and
 * "Reveal due · now" forever was the live-E2E defect. Its place is taken by when the verdict
 * was published — a fact anyone can check against the topic.
 */
export function VerdictView({
  deadlineIso,
  initialVerdict,
  publishedAtIso,
  pollVerdict,
  pollMs = 5000,
  className,
}: VerdictViewProps) {
  const [reading, setReading] = useState<VerdictReading | null>(
    initialVerdict ? { verdict: initialVerdict, publishedAt: publishedAtIso } : null,
  );
  const verdict = reading?.verdict ?? null;
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
      let next: VerdictReading | null = null;
      try {
        next = await pollVerdict();
      } catch {
        // Transient network failure — keep polling; stopping would strand the screen.
      }
      if (!active) return;
      if (next) setReading(next);
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

  const revealedAt = reading?.publishedAt ? formatRevealedAt(reading.publishedAt) : null;

  return (
    <div className={className}>
      {verdict ? (
        revealedAt ? (
          <div className="mb-6 flex flex-col items-center gap-1">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Revealed
            </span>
            <span className="font-mono text-2xl tabular-nums">{revealedAt}</span>
          </div>
        ) : null
      ) : deadlineIso ? (
        <Countdown deadlineIso={deadlineIso} className="mb-6" />
      ) : null}
      <VerdictPanel verdict={verdict} deadlineReached={deadlineReached} />
    </div>
  );
}
