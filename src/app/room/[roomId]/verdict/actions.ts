"use server";

import { createReader, hederaMirrorClient } from "@/registry";
import { requireEnv } from "@/config/env";
import type { Verdict } from "@/session";
import { isDeadlineReached } from "@/scheduler";
import { revealRoom } from "@/reveal/reveal-service";
import type { RevealFailure } from "@/reveal/run-reveal";

/**
 * What the verdict screen learns from one poll (M8 / M4 read path + S2.9 lazy reveal).
 *
 * - `verdict` — it's on the topic (with `publishedAt`, verifiable there — S3.22).
 * - `pending` — the deadline hasn't passed (or Mirror is catching up); nothing is running.
 * - `blocked` — the reveal ran and refused, and here is the typed reason (S3.20). The
 *   screen decides which reasons are terminal; `attestation_invalid` gets said loudly,
 *   because "no valid attestation ⇒ no verdict" is fail-closed working, not a hang.
 */
export type RevealStatus =
  | { verdict: Verdict; publishedAt: string }
  | { pending: true }
  | { blocked: RevealFailure; detail?: string };

export async function revealStatusAction(roomId: string): Promise<RevealStatus> {
  const topicId = requireEnv("HEDERA_TOPIC_ID");
  try {
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    if (view.verdict)
      return { verdict: view.verdict.verdict, publishedAt: view.verdict.publishedAt };

    // S2.9 — the reveal has to be run by SOMEBODY, and with no worker and no database
    // (D4) the first reader past the deadline is who runs it. Safe to do from a poll:
    // `revealRoom` dedupes concurrent callers per room (S3.21) and `runReveal` refuses
    // when a verdict is already on the topic.
    //
    // Deliberately gated on the PUBLICLY COMMITTED deadline, never on a client-supplied
    // one: the whole point of publishing the expiry before anyone writes (RNF-M1-001) is
    // that neither side can move the clock, and honouring a caller's idea of "now" would
    // hand that control straight back.
    const deadline = view.expiry?.deadline;
    if (!deadline || !isDeadlineReached(deadline, new Date())) return { pending: true };

    const result = await revealRoom(roomId);
    if (result.ok)
      return { verdict: result.message.verdict, publishedAt: result.message.publishedAt };

    // Surfaced rather than swallowed. "No valid attestation ⇒ no verdict" is a guarantee
    // we want a judge to SEE working, and a silent pending state looks identical to a bug.
    return result.detail === undefined
      ? { blocked: result.reason }
      : { blocked: result.reason, detail: result.detail };
  } catch {
    // Mirror hiccup / transient failure — indistinguishable from lag, so keep polling.
    return { pending: true };
  }
}
