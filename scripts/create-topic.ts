/* eslint-disable no-console -- CLI setup script: printing the topic id to stdout is the point. */
import { Client, AccountId, TopicCreateTransaction } from "@hashgraph/sdk";
import { parseOperatorKey } from "../src/lib/hedera-key";

/**
 * One-time setup: create the HCS topic that IS Seam's store (D4), print its id.
 *
 *   npx tsx scripts/create-topic.ts
 *
 * Reads HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY / HEDERA_NETWORK from `.env.local` (or the
 * inline env). Add the printed `HEDERA_TOPIC_ID=...` line to `.env.local`.
 */

// Load .env.local if the runtime supports it (Node >= 20.12); otherwise rely on inline env.
const proc = process as unknown as { loadEnvFile?: (path: string) => void };
try {
  proc.loadEnvFile?.(".env.local");
} catch {
  // .env.local is optional — env may be provided inline.
}

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;
const network = process.env.HEDERA_NETWORK ?? "testnet";

if (!accountId || !privateKey) {
  console.error("Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY (in .env.local or inline env).");
  process.exit(1);
}

async function main(operatorId: string, operatorKey: string, net: string): Promise<void> {
  const client = Client.forName(net).setOperator(
    AccountId.fromString(operatorId),
    parseOperatorKey(operatorKey),
  );
  const submit = await new TopicCreateTransaction()
    .setTopicMemo("Seam — ETHGlobal Lisbon 2026")
    .execute(client);
  const receipt = await submit.getReceipt(client);

  console.log("\n✅ HCS topic created.\n");
  console.log(`HEDERA_TOPIC_ID=${receipt.topicId?.toString()}\n`);
  console.log("Add that line to .env.local, then restart `npm run dev`.");
  client.close();
}

main(accountId, privateKey, network).catch((err) => {
  console.error("Failed to create topic:", err);
  process.exit(1);
});
