import {
  expiryMessageSchema,
  commitmentMessageSchema,
  verdictMessageSchema,
  type ExpiryMessage,
  type CommitmentMessage,
  type VerdictMessage,
  type RegistryPort,
} from "@/session";
import { canonicalize } from "@/lib/canonical";
// Type-only import: keeps the `server-only` SDK adapter out of this module (and its tests).
import type { TopicClient } from "./topic-client";

export interface Registry extends RegistryPort {
  /** Append a commitment (`sha256(ciphertext)` + side + nullifier) to the topic. */
  publishCommitment(
    message: CommitmentMessage,
  ): Promise<{ topicId: string; sequenceNumber: number }>;
  /**
   * Append the verdict (S2.9) — the last message a room ever gets.
   *
   * This method does not decide whether publishing is allowed. `runReveal` verifies the
   * attestation and refuses to build a `VerdictMessage` at all when it fails, so the only
   * way to reach here is with an `attestationRef` the schema forced you to have.
   */
  publishVerdict(message: VerdictMessage): Promise<{ topicId: string; sequenceNumber: number }>;
}

/**
 * The write half of `registry` (M4 · S1.3). It implements the {@link RegistryPort} that
 * `session` (M1) depends on, turning "publish the expiry" into a real HCS append, and adds
 * the commitment write. Every message is re-validated against its Zod schema before it goes
 * on the topic (defence in depth — the topic is append-only, a bad write can't be undone)
 * and serialised canonically so any verifier re-derives identical bytes.
 *
 * The Hedera SDK lives behind the injected {@link TopicClient}; this module never imports it.
 */
export function createRegistry(client: TopicClient): Registry {
  return {
    async publishExpiry(message: ExpiryMessage) {
      const valid = expiryMessageSchema.parse(message);
      return client.submit(canonicalize(valid));
    },
    async publishCommitment(message: CommitmentMessage) {
      const valid = commitmentMessageSchema.parse(message);
      return client.submit(canonicalize(valid));
    },
    async publishVerdict(message: VerdictMessage) {
      const valid = verdictMessageSchema.parse(message);
      return client.submit(canonicalize(valid));
    },
  };
}
