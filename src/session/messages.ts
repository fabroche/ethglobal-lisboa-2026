import { z } from "zod";

/**
 * Canonical HCS topic message schemas for Seam (D4/D11).
 *
 * Storage IS the Hedera Consensus Service topic — an append-only, consensus-ordered
 * log with no database. Three message types share one topic per session; consumers
 * switch on `type` and validate with Zod. Every message carries a version (`v`) from
 * message 1 so a schema change is detectable and a sequence gap betrays tampering.
 *
 * Shapes follow `docs/00-overview/02-data-model.md` (the authoritative schema doc):
 * `side` is `"A" | "B"` and the World nullifier field is `worldNullifier`. (The earlier
 * `spec-01-session.md` draft used `"a"/"b"` and `nullifierRef`; the data-model doc wins.)
 *
 * The verdict message (type 3) is written by the registry/evaluator path (M4/M6) and is
 * defined there — this module owns only what `session` (M1) needs: expiry + commitment.
 */
export const TOPIC_MESSAGE_VERSION = 1;

export const sideSchema = z.enum(["A", "B"]);
export type Side = z.infer<typeof sideSchema>;

/** ISO-8601 UTC instant (must end in `Z`), e.g. `2026-07-26T09:00:00Z`. */
const isoInstant = z.string().datetime();

/** sha256 digest as 64 lowercase hex chars. */
const sha256Hex = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "expected sha256 as 64 lowercase hex characters");

/** Expiry — published BEFORE anyone writes a word, so the clock is public first (D4/D6). */
export const expiryMessageSchema = z.object({
  v: z.literal(TOPIC_MESSAGE_VERSION),
  type: z.literal("expiry"),
  roomId: z.string().min(1),
  deadline: isoInstant,
  createdAt: isoInstant,
});
export type ExpiryMessage = z.infer<typeof expiryMessageSchema>;

/** Commitment — one per side; carries `sha256(ciphertext)`, never plaintext (D5/D8). */
export const commitmentMessageSchema = z.object({
  v: z.literal(TOPIC_MESSAGE_VERSION),
  type: z.literal("commitment"),
  roomId: z.string().min(1),
  side: sideSchema,
  commitment: sha256Hex,
  worldNullifier: z.string().min(1),
  submittedAt: isoInstant,
});
export type CommitmentMessage = z.infer<typeof commitmentMessageSchema>;

/**
 * Verdict enum — the ONLY permitted verdict values (D9). The enclave never emits free text
 * (free text leaks); `gap:*` values are only published if both sides opted in. This is the
 * canonical list; the evaluator (M6) produces one of these and the registry writes it.
 */
export const verdictSchema = z.enum([
  "workable",
  "not_workable",
  "gap:compensation",
  "gap:timing",
  "gap:scope",
]);
export type Verdict = z.infer<typeof verdictSchema>;

/**
 * Verdict — written only after `attest` passes (fail closed, D10). Carries the pinned model
 * hash and the attestation reference so a reader can tie the verdict to a verified enclave
 * run. (`modelHash` per RF-M4-002; the data-model example omits it, this is the superset.)
 */
export const verdictMessageSchema = z.object({
  v: z.literal(TOPIC_MESSAGE_VERSION),
  type: z.literal("verdict"),
  roomId: z.string().min(1),
  verdict: verdictSchema,
  modelHash: z.string().min(1),
  attestationRef: z.string().min(1),
  publishedAt: isoInstant,
});
export type VerdictMessage = z.infer<typeof verdictMessageSchema>;

/** Discriminated union of the three versioned topic message types (D4/D11). */
export const topicMessageSchema = z.discriminatedUnion("type", [
  expiryMessageSchema,
  commitmentMessageSchema,
  verdictMessageSchema,
]);
export type TopicMessage = z.infer<typeof topicMessageSchema>;

/**
 * Build a validated expiry message. Pure: the caller passes every value (including the
 * clock via `createdAt`) so the output is deterministic and unit-testable — no hidden
 * `Date.now()` sneaks into the message bytes.
 */
export function buildExpiryMessage(input: {
  roomId: string;
  deadline: string;
  createdAt: string;
}): ExpiryMessage {
  return expiryMessageSchema.parse({
    v: TOPIC_MESSAGE_VERSION,
    type: "expiry",
    ...input,
  });
}

/** Build a validated commitment message. Pure/deterministic (see {@link buildExpiryMessage}). */
export function buildCommitmentMessage(input: {
  roomId: string;
  side: Side;
  commitment: string;
  worldNullifier: string;
  submittedAt: string;
}): CommitmentMessage {
  return commitmentMessageSchema.parse({
    v: TOPIC_MESSAGE_VERSION,
    type: "commitment",
    ...input,
  });
}

/** Parse an unknown topic message, rejecting unversioned/legacy/unknown-type shapes. */
export function parseTopicMessage(raw: unknown): TopicMessage {
  return topicMessageSchema.parse(raw);
}
