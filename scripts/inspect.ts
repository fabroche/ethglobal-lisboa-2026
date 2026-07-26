/* eslint-disable no-console -- demo script: printing the store's contents to stdout is the point. */
import { Client, AccountId, TopicId, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { createHash, randomBytes } from "node:crypto";
import { parseOperatorKey } from "../src/lib/hedera-key";
import { topicMessageSchema, buildCommitmentMessage, type TopicMessage } from "../src/session/messages";
import { summarizeTopic, holdsOnlyHashes } from "../src/registry/inspect";

/**
 * DEMO script (S4.1). Open our own store (the HCS topic) live and show it holds ONLY
 * `sha256(ciphertext)` commitments + public metadata — no plaintext, not even the ciphertext,
 * no key. Proves the operator can't peek.
 *
 *   npm run inspect            # read + report on the topic
 *   npm run inspect -- --seed  # first write ONE demo commitment (a hash of random bytes)
 */
const proc = process as unknown as { loadEnvFile?: (path: string) => void };
try {
  proc.loadEnvFile?.(".env.local");
} catch {
  // optional
}

const topicId = process.env.HEDERA_TOPIC_ID;
const network = process.env.HEDERA_NETWORK ?? "testnet";
if (!topicId) {
  console.error("Set HEDERA_TOPIC_ID in .env.local.");
  process.exit(1);
}

const MIRROR: Record<string, string> = {
  testnet: "https://testnet.mirrornode.hedera.com",
  mainnet: "https://mainnet.mirrornode.hedera.com",
};
const base = MIRROR[network] ?? MIRROR.testnet!;

interface Decoded {
  sequenceNumber: number;
  consensusTimestamp: string;
  message: TopicMessage;
}

async function seedDemoCommitment(topic: string): Promise<void> {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  if (!accountId || !privateKey) {
    console.error("--seed needs HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY.");
    process.exit(1);
  }
  // The topic only ever stores sha256(ciphertext) — never the ciphertext or plaintext. Here we
  // hash random bytes as a stand-in for a sealed position, so there's a real commitment to show.
  const ciphertext = randomBytes(96);
  const commitment = createHash("sha256").update(ciphertext).digest("hex");
  const message = buildCommitmentMessage({
    roomId: "r_demo-inspect",
    side: "A",
    commitment,
    worldNullifier: "world:demo-nullifier",
    gapOptIn: false,
    submittedAt: new Date().toISOString(),
  });
  const client = Client.forName(network).setOperator(
    AccountId.fromString(accountId),
    parseOperatorKey(privateKey),
  );
  const submit = await new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topic))
    .setMessage(JSON.stringify(message))
    .execute(client);
  await submit.getReceipt(client);
  client.close();
  console.log(`Seeded a demo commitment (sha256 ${commitment.slice(0, 16)}…). Give Mirror a few seconds.\n`);
}

async function fetchTopic(topic: string): Promise<Decoded[]> {
  const out: Decoded[] = [];
  let path: string | null = `/api/v1/topics/${encodeURIComponent(topic)}/messages?limit=100&order=asc`;
  while (path) {
    const res = await fetch(base + path);
    if (!res.ok) throw new Error(`Mirror Node ${res.status} reading topic ${topic}`);
    const json = (await res.json()) as {
      messages: { consensus_timestamp: string; message: string; sequence_number: number }[];
      links?: { next: string | null };
    };
    for (const m of json.messages) {
      const decoded = JSON.parse(Buffer.from(m.message, "base64").toString("utf8"));
      out.push({
        sequenceNumber: m.sequence_number,
        consensusTimestamp: m.consensus_timestamp,
        message: topicMessageSchema.parse(decoded),
      });
    }
    path = json.links?.next ?? null;
  }
  return out;
}

async function main(topic: string): Promise<void> {
  if (process.argv.includes("--seed")) await seedDemoCommitment(topic);

  const messages = await fetchTopic(topic);
  const summary = summarizeTopic(messages);

  console.log(`\nSeam — inspecting our store: HCS topic ${topic} (via Mirror Node, ${network})\n`);
  console.log(
    `  ${summary.total} message(s)  ·  ${
      Object.entries(summary.byType).map(([k, v]) => `${k}: ${v}`).join("  ·  ") || "empty"
    }`,
  );

  if (summary.commitments.length > 0) {
    console.log(`\n  commitments (only sha256(ciphertext) is stored — never the ciphertext or the position):`);
    for (const c of summary.commitments) {
      console.log(`   #${c.seq}  side ${c.side}  sha256=${c.sha256}  world=${c.worldNullifier}`);
    }
  } else {
    console.log(`\n  (no commitments yet — they land once the write+seal screen (S3.2) is live; run with --seed for a demo one)`);
  }

  console.log(`\n  non-hash / plaintext fields on the topic: ${summary.unexpectedFields.length}`);
  if (holdsOnlyHashes(summary)) {
    console.log(`  ✅ The store holds ONLY sha256 commitments + public metadata — no plaintext, no ciphertext, no key.\n`);
  } else {
    console.error(`  ❌ ALARM — unexpected fields on the topic: ${JSON.stringify(summary.unexpectedFields)}\n`);
    process.exit(1);
  }
}

main(topicId).catch((err) => {
  console.error("inspect failed:", err);
  process.exit(1);
});
