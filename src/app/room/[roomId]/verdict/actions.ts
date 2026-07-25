"use server";

import { createReader, hederaMirrorClient } from "@/registry";
import { requireEnv } from "@/config/env";
import type { Verdict } from "@/session";
import { isDeadlineReached } from "@/scheduler";
import { revealRoom } from "@/reveal/reveal-service";

/**
 * `readVerdict` (M8 / M4 read path). Reads the room's verdict from the HCS topic via Mirror
 * Node. Returns `null` while the reveal hasn't fired (or Mirror hasn't indexed it yet), so the
 * verdict screen can keep polling and show a pending state.
 */
export async function readVerdictAction(roomId: string): Promise<Verdict | null> {
  const topicId = requireEnv("HEDERA_TOPIC_ID");
  try {
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    if (view.verdict) return view.verdict.verdict;

    // S2.9 — the reveal has to be run by SOMEBODY, and with no worker and no database
    // (D4) the first reader past the deadline is who runs it. Safe to do from a poll:
    // `runReveal` reads the topic first and refuses when a verdict is already there, so
    // concurrent pollers produce one verdict and N-1 `already_published`.
    //
    // Deliberately gated on the PUBLICLY COMMITTED deadline, never on a client-supplied
    // one: the whole point of publishing the expiry before anyone writes (RNF-M1-001) is
    // that neither side can move the clock, and honouring a caller's idea of "now" would
    // hand that control straight back.
    const deadline = view.expiry?.deadline;
    if (!deadline || !isDeadlineReached(deadline, new Date())) return null;

    const result = await revealRoom(roomId);
    return result.ok ? result.message.verdict : null;
  } catch {
    return null;
  }
}

/** Why a room that reached its deadline still has no verdict. For the pending UI + the demo. */
export async function revealStatusAction(
  roomId: string,
): Promise<{ verdict: Verdict } | { pending: true } | { blocked: string }> {
  const topicId = requireEnv("HEDERA_TOPIC_ID");
  try {
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    if (view.verdict) return { verdict: view.verdict.verdict };

    const deadline = view.expiry?.deadline;
    if (!deadline || !isDeadlineReached(deadline, new Date())) return { pending: true };

    const result = await revealRoom(roomId);
    if (result.ok) return { verdict: result.message.verdict };

    // Surfaced rather than swallowed. "No valid attestation ⇒ no verdict" is a guarantee
    // we want a judge to SEE working, and a silent pending state looks identical to a bug.
    return { blocked: `${result.reason}${result.detail ? `: ${result.detail}` : ""}` };
  } catch (error) {
    return { blocked: error instanceof Error ? error.message : "unknown" };
  }
}
