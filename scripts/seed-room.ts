/* eslint-disable no-console -- CLI/demo utility: prints the seeded room URL to stdout. */
import {
  Client,
  AccountId,
  TopicId,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import { randomUUID } from "node:crypto";
import { parseOperatorKey } from "../src/lib/hedera-key";
import { buildExpiryMessage } from "../src/session/messages";

/**
 * Demo helper: publish an `expiry` for a fresh room with a deadline N minutes out (default 120),
 * so the verdict screen shows a live, ticking countdown. Prints the room's verdict URL.
 *
 *   npx tsx scripts/seed-room.ts [minutes]
 */
const proc = process as unknown as { loadEnvFile?: (path: string) => void };
try {
  proc.loadEnvFile?.(".env.local");
} catch {
  // optional
}

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;
const topicId = process.env.HEDERA_TOPIC_ID;
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const network = process.env.HEDERA_NETWORK ?? "testnet";
const minutes = Number(process.argv[2] ?? 120);

if (!accountId || !privateKey || !topicId) {
  console.error("Set HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY / HEDERA_TOPIC_ID in .env.local.");
  process.exit(1);
}

async function main(operatorId: string, operatorKey: string, topic: string): Promise<void> {
  const roomId = `r_${randomUUID()}`;
  const now = new Date();
  const deadline = new Date(now.getTime() + minutes * 60_000);
  const message = buildExpiryMessage({
    roomId,
    deadline: deadline.toISOString(),
    createdAt: now.toISOString(),
  });

  const client = Client.forName(network).setOperator(
    AccountId.fromString(operatorId),
    parseOperatorKey(operatorKey),
  );
  const submit = await new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topic))
    .setMessage(JSON.stringify(message))
    .execute(client);
  await submit.getReceipt(client);
  client.close();

  console.log(`\n✅ Seeded room ${roomId}`);
  console.log(`   deadline: ${deadline.toISOString()} (${minutes} min out)\n`);
  console.log(`Open the live countdown:\n   ${appUrl}/room/${roomId}/verdict\n`);
}

main(accountId, privateKey, topicId).catch((err) => {
  console.error("Failed to seed room:", err);
  process.exit(1);
});
