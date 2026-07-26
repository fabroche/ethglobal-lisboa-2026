/**
 * S2.9 · the reveal runner — the one place the modules meet.
 *
 * Until this existed, Overlap had six good modules and no product: `armReveal` had tests
 * and no caller, and **nothing ever called `evaluate()`**. The demo ended in a countdown
 * that never resolved. This is the chain that closes it:
 *
 *   deadline reached
 *     → read the topic (M4)                     both commitments must be there
 *     → consentFromCommitments (M1/S2.8)        consent comes from the TOPIC, never a form
 *     → getSealedPayloads (M8/S3.2)             ciphertext only, keyed by (room, side)
 *     → unseal (D-M6-2 boundary, see below)
 *     → evaluate (M6)                           enum out, or nothing
 *     → fetch + verify the attestation (M7)     FAIL CLOSED
 *     → publishVerdict (M4)                     the last message the room ever gets
 *
 * Everything is injected. That is not ceremony: it is the only way this chain is testable
 * without a Hedera topic, a 0G wallet and a live enclave, and every branch below is a
 * branch we must be sure of before a judge watches it run once.
 *
 * ## Fail closed is enforced HERE, not downstream
 *
 * The runner refuses to build a `VerdictMessage` unless `mayPublish()` is true. There is no
 * path from a failed attestation to a published verdict, because `buildVerdictMessage`
 * requires an `attestationRef` that only a verified envelope produces (D10). A room with a
 * broken attestation ends with **no verdict at all** — which is the correct, honest outcome
 * and must be shown as such in the demo rather than papered over.
 *
 * ## ⚠️ The honest seam (D-M6-2)
 *
 * `evaluate()` takes PLAINTEXT. 0G's router is a chat API: there is nowhere to hand it a
 * private key and have it run our ECIES decryption inside the enclave. So the unsealing
 * happens HERE, on our server, and for the moment between `unseal` and the enclave call the
 * plaintext exists in our process memory.
 *
 * That means **"plaintext exists only inside the TEE" is not true of this build and must not
 * be said.** What IS true, and demonstrable: the browser seals, the topic holds only
 * ciphertext hashes (`npm run inspect`), the enclave signs over the inputs it saw, and we
 * verify that signature ourselves. Say that, and say where the seam is. An honest seam beats
 * a claim that a judge can pull apart in one question.
 */
import type { GapConsent } from "@/session";
import { buildVerdictMessage, type CommitmentMessage, type VerdictMessage } from "@/session";
import { consentFromCommitments } from "@/session";
import type { SealedPayload } from "@/seal";
import type { UseCaseId } from "@/session/usecases";

import { mayPublish, verifyEnvelope, type Envelope } from "@/evaluator/attest";
import type { EvaluateResult } from "@/evaluator";

/** Why a reveal produced no verdict. Every one of these leaves the room verdict-less. */
export type RevealFailure =
  /** Already published — the reveal fired twice (RF-M5-003 is upstream; this is the backstop). */
  | "already_published"
  /** The room has no expiry message, so no deadline was ever committed publicly. */
  | "no_expiry"
  /** One or both sides never committed. Judging one position invents the other. */
  | "incomplete_commitments"
  /** A commitment is on the topic but its sealed payload is not in the store. */
  | "missing_sealed_payload"
  /** Decryption failed — wrong key, or a tampered ciphertext (AEAD caught it). */
  | "unseal_failed"
  /** `evaluate()` refused. Carries its reason in `detail`. */
  | "evaluation_failed"
  /** No signature could be fetched for the call. No signature, no verdict. */
  | "attestation_unavailable"
  /** A signature came back and did NOT verify against the pinned key. The loud one. */
  | "attestation_invalid"
  /** The topic write itself failed. */
  | "publish_failed";

export type RevealResult =
  | {
      ok: true;
      message: VerdictMessage;
      sequenceNumber: number;
      /** True when a `gap:*` was produced but withheld for lack of two-sided consent. */
      gapWithheld: boolean;
    }
  | { ok: false; reason: RevealFailure; detail?: string };

function fail(reason: RevealFailure, detail?: string): RevealResult {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

/** What the runner needs to read about a room. Satisfied by `registry.createReader`. */
export interface RevealTopicView {
  /** In topic order (ascending sequence number) — the reader guarantees it. The runner
   * binds to the OLDEST commitment per side (S3.24b), so order is load-bearing. */
  commitments: CommitmentMessage[];
  useCase?: UseCaseId | undefined;
  hasExpiry: boolean;
  hasVerdict: boolean;
}

export interface RunRevealInput {
  roomId: string;
  /** `publishedAt` on the message. Injected so the bytes are deterministic in tests. */
  now: string;
}

export interface RunRevealDeps {
  readRoom(roomId: string): Promise<RevealTopicView>;
  /** M8/S3.2's in-memory ciphertext store. Ciphertext only — it never holds a key (D5). */
  sealedPayloads(roomId: string): Promise<{ a?: SealedPayload; b?: SealedPayload }>;
  /** The D-M6-2 boundary, injected so the honest seam has exactly one implementation. */
  unseal(payload: SealedPayload): Promise<string>;
  evaluate(input: {
    positionA: string;
    positionB: string;
    useCase: UseCaseId;
    consent: GapConsent;
  }): Promise<EvaluateResult>;
  /** Fetch the enclave signature for the call `evaluate` just made (M7). */
  attestation(): Promise<{ ok: true; envelope: Envelope } | { ok: false; detail: string }>;
  /** `OG_ENCLAVE_PUBKEY` — the `teeSignerAddress`, NOT the provider address. */
  pinnedKey: string;
  publishVerdict(message: VerdictMessage): Promise<{ sequenceNumber: number }>;
  /** Fallback when the model does not echo one; recorded with the verdict (RF-M4-002). */
  fallbackModelHash?: string;
}

/** The use case the enclave is told about. Legacy rooms predate D16 — default, never guess. */
const DEFAULT_USE_CASE: UseCaseId = "property";

export async function runReveal(
  input: RunRevealInput,
  deps: RunRevealDeps,
): Promise<RevealResult> {
  const room = await deps.readRoom(input.roomId);

  // Idempotence backstop. `onRevealFired` (M5) guarantees exactly-once per schedule, but
  // the topic is the durable truth and a second runner must not append a second verdict.
  if (room.hasVerdict) return fail("already_published");
  if (!room.hasExpiry) return fail("no_expiry");

  // S3.24(b) — the binding commitment is the OLDEST per side (`find` on topic order).
  // A duplicate that slipped past the write-path guards can neither swap the judged
  // position nor revoke a consent the other side already matched: whatever a later
  // message says, the room is judged against the first thing each side committed to.
  const bindingA = room.commitments.find((c) => c.side === "A");
  const bindingB = room.commitments.find((c) => c.side === "B");
  if (!bindingA || !bindingB) {
    return fail("incomplete_commitments", `A=${Boolean(bindingA)} B=${Boolean(bindingB)}`);
  }

  // Consent is derived from the two binding commitments on the topic — never from the
  // create form, which is only Side A's prefill (S2.8). Absent ⇒ not consented.
  const consent = consentFromCommitments([bindingA, bindingB]);

  const sealed = await deps.sealedPayloads(input.roomId);
  if (!sealed.a || !sealed.b) {
    // A commitment exists on the topic but the ciphertext is gone: the store is
    // per-process (D4, no DB), so a server restart between commit and reveal lands here.
    return fail("missing_sealed_payload", `a=${Boolean(sealed.a)} b=${Boolean(sealed.b)}`);
  }

  let positionA: string;
  let positionB: string;
  try {
    [positionA, positionB] = await Promise.all([deps.unseal(sealed.a), deps.unseal(sealed.b)]);
  } catch (error) {
    // Never include the error's payload: on an AEAD failure the detail can carry
    // fragments of what was being decrypted.
    return fail("unseal_failed", error instanceof Error ? error.name : "unknown");
  }

  const evaluation = await deps.evaluate({
    positionA,
    positionB,
    useCase: room.useCase ?? DEFAULT_USE_CASE,
    consent,
  });
  if (!evaluation.ok) {
    return fail("evaluation_failed", `${evaluation.reason}${evaluation.detail ? `: ${evaluation.detail}` : ""}`);
  }

  // ---- FAIL CLOSED (D10). Nothing below may be skipped. ----
  const fetched = await deps.attestation();
  if (!fetched.ok) return fail("attestation_unavailable", fetched.detail);

  const attested = verifyEnvelope(fetched.envelope, deps.pinnedKey);
  if (!mayPublish(attested)) {
    return fail(
      "attestation_invalid",
      attested.verified ? undefined : `${attested.reason}${attested.detail ? `: ${attested.detail}` : ""}`,
    );
  }

  const attestationRef = fetched.envelope.attestationRef ?? `signer:${attested.signer}`;
  const message = buildVerdictMessage({
    roomId: input.roomId,
    verdict: evaluation.verdict,
    // The EXACT snapshot the provider served, not the family we pinned — the catalog
    // says `0gm-1.0-35b-a3b`, the provider serves `0GM-1.0-35B-A3B-0427` (RF-M6-005).
    modelHash: evaluation.model ?? deps.fallbackModelHash ?? "unknown",
    attestationRef,
    publishedAt: input.now,
  });

  try {
    const { sequenceNumber } = await deps.publishVerdict(message);
    return { ok: true, message, sequenceNumber, gapWithheld: evaluation.gapWithheld };
  } catch (error) {
    return fail("publish_failed", error instanceof Error ? error.message : String(error));
  }
}
