"use client";

import { useState, useEffect } from "react";
import { Countdown } from "./countdown";
import { VerdictPanel, type BlockedInfo } from "./verdict-panel";
import type { Verdict } from "@/session";
import type { RevealFailure } from "@/reveal/run-reveal";

/** A landed verdict and when it was published, as the poll reports it (S3.22). */
export interface VerdictReading {
  verdict: Verdict;
  publishedAt?: string;
}

/** One poll's outcome — mirrors `revealStatusAction` (S3.20). */
export type PollStatus =
  | { verdict: Verdict; publishedAt?: string }
  | { pending: true }
  | { blocked: RevealFailure; detail?: string };

/**
 * Reasons that end the wait: no amount of further polling changes them, so the poll stops
 * and the panel says why there is no verdict — loudly, for `attestation_invalid` (S3.20).
 *
 * Everything else keeps polling: `already_published` resolves on the next Mirror read,
 * transient failures (enclave hiccup, broker down, topic write) retry on the next reveal
 * attempt, and `incomplete_commitments` can still recover if the missing side commits late.
 */
const TERMINAL_REASONS: ReadonlySet<RevealFailure> = new Set([
  "attestation_invalid",
  "missing_sealed_payload",
  "unseal_failed",
  "no_expiry",
]);

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
  /** Poll the reveal status (verdict / pending / typed blocked reason). Injected for tests. */
  pollStatus?: () => Promise<PollStatus>;
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
 *
 * And a room that can NEVER resolve stops spinning (S3.20): a terminal blocked reason ends
 * the poll and the panel states why there is no verdict, instead of promising one forever.
 */
export function VerdictView({
  deadlineIso,
  initialVerdict,
  publishedAtIso,
  pollStatus,
  pollMs = 5000,
  className,
}: VerdictViewProps) {
  const [reading, setReading] = useState<VerdictReading | null>(
    initialVerdict ? { verdict: initialVerdict, publishedAt: publishedAtIso } : null,
  );
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);
  const verdict = reading?.verdict ?? null;
  // `null` until the client has a clock. The server has no business guessing "now" — and
  // rendering a spinner on the server that the client then removes is a hydration mismatch.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (verdict || !pollStatus) return;
    let active = true;
    // S3.21(a): a self-rescheduling timeout, NOT setInterval. The poll triggers the lazy
    // reveal server-side, which takes far longer than pollMs (enclave call + attestation +
    // topic write) — an interval fires again mid-flight and stacks concurrent reveals.
    // The next poll is armed only after the previous one has fully returned.
    let id: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let status: PollStatus | null = null;
      try {
        status = await pollStatus();
      } catch {
        // Transient network failure — keep polling; stopping would strand the screen.
      }
      if (!active) return;
      if (status && "verdict" in status) {
        setReading(status);
        return; // the verdict ends the loop (and the effect re-runs with verdict set)
      }
      if (status && "blocked" in status) {
        setBlocked(status);
        if (TERMINAL_REASONS.has(status.blocked)) return; // S3.20 — stop promising
      } else if (status) {
        // Back to pending (e.g. the reveal's guard raced Mirror) — clear a stale reason.
        setBlocked(null);
      }
      id = setTimeout(poll, pollMs);
    };
    id = setTimeout(poll, pollMs);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [verdict, pollStatus, pollMs]);

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
  // A room that ended without a verdict has nothing due — "Reveal due · now" would lie.
  const endedWithoutVerdict = blocked !== null && TERMINAL_REASONS.has(blocked.blocked);

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
      ) : deadlineIso && !endedWithoutVerdict ? (
        <Countdown deadlineIso={deadlineIso} className="mb-6" />
      ) : null}
      <VerdictPanel verdict={verdict} deadlineReached={deadlineReached} blocked={blocked} />
    </div>
  );
}
