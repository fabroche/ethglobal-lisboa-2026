"use server";

import { z } from "zod";
import { env, requireEnv } from "@/config/env";
import { createReader, createRegistry, hederaMirrorClient, hederaTopicClient } from "@/registry";
import {
  buildCommitmentMessage,
  sideSchema,
} from "@/session";
import { sealedPayloadSchema, commitmentOf, type SealedPayload } from "@/seal";
import {
  claimSeat,
  initSeatRegistry,
  worldProofSchema,
  type SeatRegistry,
} from "@/worldid";
import { worldVerifierForRequest } from "@/worldid/e2e-verifier";

/**
 * `submitCommitment` Server Action (M8 / M2+M3+M4, S3.2).
 * Order is the security property: verify the Selfie Check proof and reserve the seat
 * (fail closed, one per `(room, side)`) BEFORE anything is written; then publish the
 * versioned commitment (sha256 + nullifier + this side's gap consent, D9 amended) to the
 * HCS topic. The sealed ciphertext itself is parked server-side for the reveal — the
 * topic only ever carries the hash.
 */

const inputSchema = z.object({
  roomId: z.string().min(1),
  side: sideSchema,
  sealedPayload: sealedPayloadSchema,
  commitment: z.string().regex(/^[0-9a-f]{64}$/),
  worldProof: worldProofSchema,
  gapOptIn: z.boolean(),
});
export type SubmitCommitmentActionInput = z.input<typeof inputSchema>;

// One seat per (room, side), per server process. No DB (D4): for the hackathon demo a
// single server instance holds the seats. The durable backstop is the topic check in
// `submitCommitmentAction` (S3.24c) — with the honest caveat that Mirror indexes in ~3 s,
// so it closes the restart/second-instance case, not a fast race.
let seats: SeatRegistry = initSeatRegistry();

// The sealed payloads await the reveal here — ciphertext only, keyed by (room, side).
// This is the hand-off point for M6 `evaluate({ ciphertextA, ciphertextB, … })` (Frank):
// the enclave gets these; the store never holds a key to open them (D5).
const sealedByRoom = new Map<string, SealedPayload>();
const vaultKey = (roomId: string, side: string) => `${roomId}#${side}`;

/** M6 reads the two sealed payloads for a room at reveal time. `undefined` until both sides commit. */
export async function getSealedPayloads(
  roomId: string,
): Promise<{ a?: SealedPayload; b?: SealedPayload }> {
  return { a: sealedByRoom.get(vaultKey(roomId, "A")), b: sealedByRoom.get(vaultKey(roomId, "B")) };
}

/**
 * Typed result instead of `throw`: Next.js masks thrown Server Action errors in production
 * behind a digest ("An error occurred in the Server Components render…"), which turned a
 * diagnosable World rejection into gibberish during live testing (Sat night). Our failure
 * messages are operational, not sensitive — they belong on the screen.
 */
export type SubmitCommitmentResult =
  | { ok: true; sequenceNumber: number }
  | { ok: false; message: string };

export async function submitCommitmentAction(
  raw: SubmitCommitmentActionInput,
): Promise<SubmitCommitmentResult> {
  try {
    const input = inputSchema.parse(raw);

    // Defence in depth: recompute the commitment from the ciphertext; reject a mismatch
    // before any side effect (the client is untrusted).
    if (commitmentOf(input.sealedPayload) !== input.commitment) {
      return { ok: false, message: "commitment does not match the sealed payload" };
    }

    // 1. S3.24(c) — the durable backstop: check the TOPIC for a commitment from this
    // side before any side effect. The in-memory seat registry dies with the process, so
    // after a restart (or on another instance) it would happily let a side commit twice.
    // Mirror indexes in ~3 s: this closes the restart case, NOT a fast race — the seat
    // claim below stays. Checked before the World gate on purpose: the action allows one
    // verification per person, and a doomed submit must not consume it.
    const topicId = requireEnv("HEDERA_TOPIC_ID");
    try {
      const view = await createReader(hederaMirrorClient()).readSession(topicId, {
        roomId: input.roomId,
      });
      if (view.commitments.some((c) => c.side === input.side)) {
        return {
          ok: false,
          message:
            "this side already committed to this room — a position can't be rewritten once committed",
        };
      }
    } catch {
      // Mirror down or lagging: don't block the write path on the read path. The seat
      // claim below is still the in-process guard.
    }

    // 2. One seat per (room, side): server-side World verification, fail closed (M3).
    const appId = requireEnv("WORLD_APP_ID");
    const claim = await claimSeat(
      { roomId: input.roomId, side: input.side, appId, proof: input.worldProof },
      { verifier: worldVerifierForRequest(), seats },
    );
    seats = claim.seats;

    // 3. Park the ciphertext for the reveal (M6), then publish the commitment (M4).
    // S3.24(a): never overwrite. If a duplicate slips past every guard, the ciphertext
    // must keep matching the FIRST commitment — the binding one (the reveal judges the
    // oldest per side) — or the enclave would judge text the topic never committed to.
    const key = vaultKey(input.roomId, input.side);
    if (!sealedByRoom.has(key)) {
      sealedByRoom.set(key, input.sealedPayload);
    }
    const message = buildCommitmentMessage({
      roomId: input.roomId,
      side: input.side,
      commitment: input.commitment,
      worldNullifier: claim.nullifierRef,
      gapOptIn: input.gapOptIn,
      submittedAt: new Date().toISOString(),
    });
    const registry = createRegistry(hederaTopicClient());
    const { sequenceNumber } = await registry.publishCommitment(message);
    return { ok: true, sequenceNumber };
  } catch (err) {
    // Client gets the typed message; the server log keeps the stack (digest hides it otherwise).
    console.error("[submitCommitment]", err);
    return { ok: false, message: err instanceof Error ? err.message : "could not submit" };
  }
}

/**
 * Has the room's expiry been indexed by Mirror yet? (S3.26.) A freshly created room
 * reaches Hedera consensus instantly but Mirror's REST index lags ~3–10 s, so the write
 * page's first read can miss it. The client polls this and refreshes once it flips true,
 * instead of the user retrying by hand. Best-effort: any read error reads as "not yet".
 */
export async function roomHasExpiry(roomId: string): Promise<boolean> {
  try {
    const topicId = requireEnv("HEDERA_TOPIC_ID");
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    return Boolean(view.expiry);
  } catch {
    return false;
  }
}

/** Expose whether sealing is configured without leaking anything else to the client. */
export async function sealingConfig(): Promise<{
  enclaveSealKey: string | null;
  worldAppId: string | null;
}> {
  return {
    enclaveSealKey: env.OG_ENCLAVE_SEAL_PUBKEY ?? null,
    worldAppId: env.WORLD_APP_ID ?? null,
  };
}
