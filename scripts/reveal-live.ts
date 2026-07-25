/**
 * `npm run reveal:live` — S2.9 acceptance against the REAL services.
 *
 * The 362 unit tests prove the logic against fakes. They cannot prove that Mirror Node
 * indexes in time, that the broker hands back a chatID we can fetch a signature for, or
 * that the signature verifies against the key we pinned. Those fail for different reasons
 * and every one of them ends the demo in a countdown that never resolves.
 *
 * So this drives the whole chain end to end:
 *
 *   create a room on the topic  ->  seal two positions in-process  ->  publish both
 *   commitments  ->  runReveal: read topic, derive consent, unseal, call the enclave,
 *   fetch + VERIFY the signature, publish the verdict  ->  read it back from Mirror
 *
 * ⚠️ THIS SPENDS AND WRITES. Real HBAR (a handful of topic messages on testnet) and a real
 * 0G inference call (~0.0005 0G). The topic is append-only: the room it creates is there
 * forever. That is the point — it is the same path the demo takes.
 *
 * What is NOT covered: the browser (sealing runs here, not in a page) and the World gate.
 * Those need a human with a phone — that is S3.4.
 */
/* eslint-disable no-console -- The stdout report IS the deliverable, as in the spike. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Load .env.local BEFORE src/config/env.ts is imported (Zod, fail-fast). */
function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/u)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/u.exec(line);
    if (!match) continue;
    let value = match[2]!.trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0]!;
      const end = value.indexOf(quote, 1);
      value = end === -1 ? value.slice(1) : value.slice(1, end);
    } else {
      value = value.replace(/\s+#.*$/u, "").trim();
    }
    if (!(match[1]! in process.env)) process.env[match[1]!] = value;
  }
}
loadEnvLocal();

import { seal } from "../src/seal/seal";
import { unseal } from "../src/seal/unseal-testkit";
import { fromHex } from "../src/seal/seal";
import { buildCommitmentMessage, buildExpiryMessage } from "../src/session/messages";
import {
  AccountId,
  Client,
  TopicId,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

import { parseOperatorKey } from "../src/lib/hedera-key";
import { createRegistry } from "../src/registry/write";
import type { TopicClient } from "../src/registry/topic-client";
import { createReader } from "../src/registry/read";
import { hederaMirrorClient } from "../src/registry/mirror-client";
import { evaluate } from "../src/evaluator/evaluate";
import { fetchSignatureEnvelope } from "../src/evaluator/og-signature";
import { runReveal, type RevealTopicView } from "../src/reveal/run-reveal";
import { buildSealedModel, looksLikePrivateKey } from "./lib/sealed-model";

const c = {
  reset: "[0m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
};

let failures = 0;
function check(label: string, ok: boolean, detail?: string): void {
  if (!ok) failures++;
  const mark = ok ? `${c.green}PASS${c.reset}` : `${c.red}FAIL${c.reset}`;
  console.log(`  ${mark}  ${label}${detail ? `${c.dim} — ${detail}${c.reset}` : ""}`);
}

function need(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${c.red}Missing ${name} in .env.local${c.reset}`);
    process.exit(2);
  }
  return value;
}

/**
 * Deliberately unambiguous positions, as in `eval:live`. If the negotiation itself were
 * close, a surprising verdict would tell us nothing about whether the CHAIN works — which
 * is the only thing this script is testing.
 */
const POSITION_A =
  "I am selling my flat. I want 500,000 EUR and I will not go below 495,000. " +
  "I need to complete the sale within 60 days because I am relocating.";
const POSITION_B =
  "I am buying. My budget is 200,000 EUR maximum, I cannot go higher. " +
  "I also need at least 8 months before I can complete.";

async function main(): Promise<void> {
  console.log(`\n${c.yellow}S2.9 · reveal, end to end, against the real services${c.reset}`);
  console.log(`${c.dim}Writes to the Hedera topic and spends ~0.0005 0G.${c.reset}\n`);

  const topicId = need("HEDERA_TOPIC_ID");
  const pinnedKey = need("OG_ENCLAVE_PUBKEY");
  const sealPubKey = need("OG_ENCLAVE_SEAL_PUBKEY");
  const demoSecret = need("OG_DEMO_SEAL_SECRET");
  const ogWallet = need("OG_WALLET_PRIVATE_KEY");
  const pinned = process.env.OG_MODEL?.trim();

  if (!looksLikePrivateKey(ogWallet)) {
    console.error(`${c.red}OG_WALLET_PRIVATE_KEY is not a 32-byte hex key${c.reset}`);
    process.exit(2);
  }

  const roomId = `r_live_${Date.now().toString(36)}`;

  // The app's `hederaTopicClient()` is `server-only` — importing it outside Next throws.
  // Same SDK calls, built here, so `createRegistry` (Zod + canonical serialisation) is
  // still the code under test rather than a copy of it.
  const hedera = Client.forName(process.env.HEDERA_NETWORK ?? "testnet").setOperator(
    AccountId.fromString(need("HEDERA_ACCOUNT_ID")),
    parseOperatorKey(need("HEDERA_PRIVATE_KEY")),
  );
  const topicClient: TopicClient = {
    async submit(message) {
      const tx = await new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(message)
        .execute(hedera);
      const receipt = await tx.getReceipt(hedera);
      return { topicId, sequenceNumber: Number(receipt.topicSequenceNumber ?? 0) };
    },
  };
  const registry = createRegistry(topicClient);
  const reader = createReader(hederaMirrorClient());

  // ---- 1. Open the room on the topic, exactly as `createRoom` does. ----
  console.log(`${c.yellow}1. Open the room${c.reset}`);
  const deadline = new Date(Date.now() - 60_000).toISOString(); // already past: reveal now
  await registry.publishExpiry(
    buildExpiryMessage({ roomId, useCase: "property", deadline, createdAt: new Date().toISOString() }),
  );
  check("expiry published to the topic", true, `${roomId} · deadline already passed`);

  // ---- 2. Seal both positions and commit. ----
  console.log(`\n${c.yellow}2. Seal + commit both sides${c.reset}`);
  const sealedA = await seal(POSITION_A, sealPubKey);
  const sealedB = await seal(POSITION_B, sealPubKey);
  check("both positions sealed", true, `commitments ${sealedA.commitment.slice(0, 12)}… / ${sealedB.commitment.slice(0, 12)}…`);

  // Round-trips locally first: if the demo key is wrong, fail here rather than after
  // spending a 0G call on a request built from garbage.
  const roundTrip = await unseal(sealedA.sealedPayload, fromHex(demoSecret)).catch(() => null);
  check("the demo secret opens what the browser key sealed", roundTrip === POSITION_A);
  if (roundTrip !== POSITION_A) {
    console.log(`\n${c.red}OG_DEMO_SEAL_SECRET does not match OG_ENCLAVE_SEAL_PUBKEY.${c.reset}`);
    process.exit(1);
  }

  for (const [side, sealed] of [["A", sealedA], ["B", sealedB]] as const) {
    await registry.publishCommitment(
      buildCommitmentMessage({
        roomId,
        side,
        commitment: sealed.commitment,
        worldNullifier: `live-test-${side}`,
        gapOptIn: false,
        submittedAt: new Date().toISOString(),
      }),
    );
  }
  check("both commitments published", true);

  // ---- 3. Wait for Mirror to index. This is a real failure mode, not a formality. ----
  console.log(`\n${c.yellow}3. Wait for Mirror Node${c.reset}`);
  let view: Awaited<ReturnType<typeof reader.readSession>> | undefined;
  const started = Date.now();
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 3_000));
    try {
      view = await reader.readSession(topicId, { roomId });
      if (view.expiry && view.commitments.length === 2) break;
    } catch {
      // Mirror can 404 a topic it has not caught up on yet.
    }
  }
  const indexed = Boolean(view?.expiry) && view?.commitments.length === 2;
  check("Mirror indexed the expiry + both commitments", indexed, `${Math.round((Date.now() - started) / 1000)}s`);
  if (!indexed) {
    console.log(`\n${c.red}Mirror never caught up. The reveal cannot read the room.${c.reset}`);
    process.exit(1);
  }

  // ---- 4. The reveal itself. ----
  console.log(`\n${c.yellow}4. Reveal: enclave call, attestation, publish${c.reset}`);
  const model = await buildSealedModel({ privateKey: ogWallet });
  check("broker reachable, service metadata resolved", true, `serves ${model.servedModel}`);

  const result = await runReveal(
    { roomId, now: new Date().toISOString() },
    {
      async readRoom(): Promise<RevealTopicView> {
        const fresh = await reader.readSession(topicId, { roomId });
        return {
          commitments: fresh.commitments,
          useCase: fresh.expiry?.useCase,
          hasExpiry: Boolean(fresh.expiry),
          hasVerdict: Boolean(fresh.verdict),
        };
      },
      // In the app these come from the server's in-process store (S3.2). Here they come
      // from the seals made above — same ciphertext, same shape.
      sealedPayloads: async () => ({ a: sealedA.sealedPayload, b: sealedB.sealedPayload }),
      unseal: (payload) => unseal(payload, fromHex(demoSecret)),
      evaluate: (input) => evaluate(input, { model, pinnedModel: pinned }),
      async attestation() {
        const fetched = await fetchSignatureEnvelope({
          baseUrl: model.signatureBase,
          chatId: model.lastChatId(),
          model: model.servedModel,
        });
        return fetched.ok
          ? { ok: true, envelope: fetched.envelope }
          : { ok: false, detail: `${fetched.reason}${fetched.detail ? `: ${fetched.detail}` : ""}` };
      },
      pinnedKey,
      fallbackModelHash: pinned,
      async publishVerdict(message) {
        const { sequenceNumber } = await registry.publishVerdict(message);
        return { sequenceNumber };
      },
    },
  );

  check(
    "runReveal produced a verdict",
    result.ok,
    result.ok ? result.message.verdict : `${result.reason}: ${result.detail ?? ""}`,
  );

  if (!result.ok) {
    console.log(`\n${c.red}NO GO — the loop does not close against the real services.${c.reset}`);
    console.log(`${c.dim}Reason: ${result.reason}${result.detail ? ` — ${result.detail}` : ""}${c.reset}\n`);
    process.exit(1);
  }

  check("the verdict is not_workable, as these positions demand", result.message.verdict === "not_workable", result.message.verdict);
  check("it carries the exact model served", result.message.modelHash.length > 0, result.message.modelHash);
  check("it carries an attestation reference", result.message.attestationRef.length > 0);

  // ---- 5. Read it back the way both parties will. ----
  console.log(`\n${c.yellow}5. Read the verdict back through Mirror${c.reset}`);
  let published: string | undefined;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 3_000));
    const fresh = await reader.readSession(topicId, { roomId }).catch(() => undefined);
    if (fresh?.verdict) {
      published = fresh.verdict.verdict;
      break;
    }
  }
  check("both sides can read the same verdict from the topic", published === result.message.verdict, published);

  // ---- 6. Idempotence: a second reveal must not append a second verdict. ----
  console.log(`\n${c.yellow}6. A second reveal must refuse${c.reset}`);
  const again = await runReveal(
    { roomId, now: new Date().toISOString() },
    {
      async readRoom(): Promise<RevealTopicView> {
        const fresh = await reader.readSession(topicId, { roomId });
        return {
          commitments: fresh.commitments,
          useCase: fresh.expiry?.useCase,
          hasExpiry: Boolean(fresh.expiry),
          hasVerdict: Boolean(fresh.verdict),
        };
      },
      sealedPayloads: async () => ({ a: sealedA.sealedPayload, b: sealedB.sealedPayload }),
      unseal: (payload) => unseal(payload, fromHex(demoSecret)),
      evaluate: (input) => evaluate(input, { model, pinnedModel: pinned }),
      attestation: async () => ({ ok: false, detail: "not reached" }),
      pinnedKey,
      async publishVerdict(message) {
        const { sequenceNumber } = await registry.publishVerdict(message);
        return { sequenceNumber };
      },
    },
  );
  check("refused with already_published", !again.ok && again.reason === "already_published", again.ok ? "PUBLISHED TWICE" : again.reason);

  console.log(
    failures === 0
      ? `\n${c.green}GO — the loop closes against the real services. Room ${roomId}.${c.reset}\n`
      : `\n${c.red}${failures} check(s) failed.${c.reset}\n`,
  );
  hedera.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(`\n${c.red}Crashed:${c.reset}`, error);
  process.exit(1);
});
