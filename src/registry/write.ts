import {
  expiryMessageSchema,
  commitmentMessageSchema,
  type ExpiryMessage,
  type CommitmentMessage,
  type RegistryPort,
} from "@/session";
import { canonicalJson } from "./canonical";
// Type-only import: keeps the `server-only` SDK adapter out of this module (and its tests).
import type { TopicClient } from "./topic-client";

export interface Registry extends RegistryPort {
  /** Append a commitment (`sha256(ciphertext)` + side + nullifier) to the topic. */
  publishCommitment(
    message: CommitmentMessage,
  ): Promise<{ topicId: string; sequenceNumber: number }>;
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
      return client.submit(canonicalJson(valid));
    },
    async publishCommitment(message: CommitmentMessage) {
      const valid = commitmentMessageSchema.parse(message);
      return client.submit(canonicalJson(valid));
    },
  };
}
