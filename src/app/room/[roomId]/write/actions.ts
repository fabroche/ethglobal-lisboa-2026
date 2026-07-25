"use server";

import { z } from "zod";
import { env, requireEnv } from "@/config/env";
import { createRegistry, hederaTopicClient } from "@/registry";
import {
  buildCommitmentMessage,
  sideSchema,
} from "@/session";
import { sealedPayloadSchema, commitmentOf, type SealedPayload } from "@/seal";
import {
  claimSeat,
  cloudWorldVerifier,
  initSeatRegistry,
  worldProofSchema,
  type SeatRegistry,
} from "@/worldid";

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
// single server instance holds the seats; the topic's one-commitment-per-side rule is the
// durable backstop.
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

    // 1. One seat per (room, side): server-side World verification, fail closed (M3).
    const appId = requireEnv("WORLD_APP_ID");
    const claim = await claimSeat(
      { roomId: input.roomId, side: input.side, appId, proof: input.worldProof },
      { verifier: cloudWorldVerifier(), seats },
    );
    seats = claim.seats;

    // 2. Park the ciphertext for the reveal (M6), then publish the commitment (M4).
    sealedByRoom.set(vaultKey(input.roomId, input.side), input.sealedPayload);
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
    return { ok: false, message: err instanceof Error ? err.message : "could not submit" };
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
