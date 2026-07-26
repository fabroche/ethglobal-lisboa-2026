import "server-only";
import {
  Client,
  AccountId,
  TopicId,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import { env, requireEnv } from "@/config/env";
import { parseOperatorKey } from "@/lib/hedera-key";

/**
 * The Hedera SDK boundary. `write.ts` depends on this narrow interface, never on the SDK
 * directly, so the write logic is unit-testable with a fake and the SDK is exercised only
 * through this thin adapter (and E2E against testnet).
 *
 * `server-only`: this handles our Hedera private key (D8 — our testnet account signs, never
 * a user). It must never be bundled into a client component.
 */
export interface TopicClient {
  /** Append `message` (a serialised topic message) to the topic; returns its consensus seq. */
  submit(message: string): Promise<{ topicId: string; sequenceNumber: number }>;
}

/**
 * Build the real Hedera-backed topic client from validated env. Requires
 * `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, and `HEDERA_TOPIC_ID` (created once by setup).
 * Constructing the client is offline; only `submit()` touches the network.
 */
export function hederaTopicClient(): TopicClient {
  const accountId = requireEnv("HEDERA_ACCOUNT_ID");
  const privateKey = requireEnv("HEDERA_PRIVATE_KEY");
  const topicId = requireEnv("HEDERA_TOPIC_ID");

  const client = Client.forName(env.HEDERA_NETWORK).setOperator(
    AccountId.fromString(accountId),
    parseOperatorKey(privateKey),
  );

  return {
    async submit(message: string) {
      const submitTx = await new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(message)
        .execute(client);
      const receipt = await submitTx.getReceipt(client);
      const seq = receipt.topicSequenceNumber;
      return { topicId, sequenceNumber: seq ? seq.toNumber() : -1 };
    },
  };
}
