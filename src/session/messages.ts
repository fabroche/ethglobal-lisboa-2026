import { z } from "zod";
import { useCaseIdSchema, type UseCaseId } from "./usecases";

/**
 * Canonical HCS topic message schemas for Overlap (D4/D11).
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

/** Expiry — published BEFORE anyone writes a word, so the clock is public first (D4/D6).
 * `useCase` (D16) is public metadata naming the deal *type*, never the terms; it is optional
 * so pre-D16 expiry messages already on the live topic still parse (missing ⇒ legacy room). */
export const expiryMessageSchema = z.object({
  v: z.literal(TOPIC_MESSAGE_VERSION),
  type: z.literal("expiry"),
  roomId: z.string().min(1),
  useCase: useCaseIdSchema.optional(),
  /** Context anchor: the announcement (listing/offer URL or one line). Public-class metadata
   * like `useCase` — names what the deal concerns, NEVER a side's terms. Optional. */
  about: z.string().min(1).max(200).optional(),
  deadline: isoInstant,
  createdAt: isoInstant,
});
export type ExpiryMessage = z.infer<typeof expiryMessageSchema>;

/** Commitment — one per side; carries `sha256(ciphertext)`, never plaintext (D5/D8).
 * `gapOptIn` is this side's consent to gap disclosure (D9 as amended): `gap:*` verdicts are
 * allowed only if BOTH commitments carry `true`. Defaulted (not required) at parse so a
 * pre-existing commitment without the field reads as `false` — missing consent fails safe
 * to the bare verdict, never to disclosure. */
export const commitmentMessageSchema = z.object({
  v: z.literal(TOPIC_MESSAGE_VERSION),
  type: z.literal("commitment"),
  roomId: z.string().min(1),
  side: sideSchema,
  commitment: sha256Hex,
  worldNullifier: z.string().min(1),
  gapOptIn: z.boolean().default(false),
  submittedAt: isoInstant,
});
export type CommitmentMessage = z.infer<typeof commitmentMessageSchema>;

/**
 * Verdict enum — the ONLY permitted verdict values (D9 as amended). The enclave never emits
 * free text (free text leaks); `gap:*` values are only published if both sides opted in, and
 * reveal HOW MANY dimensions block — never which. The dimensions (compensation/timing/scope)
 * exist only inside the enclave as the counting basis: `gap:single` = exactly one blocks (a
 * deal is one issue away), `gap:multiple` = several block or they're too entangled to
 * attribute to one. This is the canonical list; the evaluator (M6) produces one of these and
 * the registry writes it.
 */
export const verdictSchema = z.enum([
  "workable",
  "not_workable",
  "gap:single",
  "gap:multiple",
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
  useCase?: UseCaseId;
  about?: string;
  deadline: string;
  createdAt: string;
}): ExpiryMessage {
  return expiryMessageSchema.parse({
    v: TOPIC_MESSAGE_VERSION,
    type: "expiry",
    ...input,
  });
}

/** Build a validated commitment message. Pure/deterministic (see {@link buildExpiryMessage}).
 * `gapOptIn` is required here on purpose: the writer (S3.2) must pass the side's explicit
 * choice — the schema default exists only to fail legacy reads safe, not to let a writer
 * forget consent. */
export function buildCommitmentMessage(input: {
  roomId: string;
  side: Side;
  commitment: string;
  worldNullifier: string;
  gapOptIn: boolean;
  submittedAt: string;
}): CommitmentMessage {
  return commitmentMessageSchema.parse({
    v: TOPIC_MESSAGE_VERSION,
    type: "commitment",
    ...input,
  });
}

/**
 * Build a validated verdict message (S2.9). Pure/deterministic (see {@link buildExpiryMessage}).
 *
 * `attestationRef` is required by the schema and that is the point: it is the evidence a
 * reader needs to tie this verdict to a verified enclave run. There is deliberately no way
 * to build this message without one — fail closed (D10) has to be unforgeable at the type
 * level, not a rule the publish path is trusted to remember.
 */
export function buildVerdictMessage(input: {
  roomId: string;
  verdict: Verdict;
  modelHash: string;
  attestationRef: string;
  publishedAt: string;
}): VerdictMessage {
  return verdictMessageSchema.parse({
    v: TOPIC_MESSAGE_VERSION,
    type: "verdict",
    ...input,
  });
}

/** Parse an unknown topic message, rejecting unversioned/legacy/unknown-type shapes. */
export function parseTopicMessage(raw: unknown): TopicMessage {
  return topicMessageSchema.parse(raw);
}
