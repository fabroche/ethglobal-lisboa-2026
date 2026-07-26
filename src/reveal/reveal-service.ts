import "server-only";

/**
 * S2.9 · composition root for the reveal. The only place the real adapters meet.
 *
 * `run-reveal.ts` holds the logic and knows nothing about Hedera, 0G or env vars — that is
 * what makes every branch of fail-closed testable. This file is the opposite: no decisions,
 * only wiring. If you are looking for behaviour, it is next door.
 *
 * ## Why a reader triggers this, and not a background worker
 *
 * There is no worker and no database (D4). Hedera's scheduled transaction is the *public*
 * clock — it is what makes the deadline a fact neither party controls — but something still
 * has to run the evaluation, and on Vercel there is no always-on process to run it.
 *
 * So the first reader to open the verdict screen after the deadline fires it. That sounds
 * fragile and is not, because the topic is the durable truth: `runReveal` refuses when a
 * verdict is already there, so N simultaneous readers produce one verdict and N-1
 * `already_published`. Hedera's schedule (M5, DA5) stays armed as the record of when this
 * was allowed to happen.
 */
import { createReader, createRegistry, hederaMirrorClient, hederaTopicClient } from "@/registry";
import { requireEnv, env } from "@/config/env";
import { useCaseIdSchema } from "@/session";
import { unseal } from "@/seal/unseal-testkit";
import { fromHex } from "@/seal/seal";
import { evaluate } from "@/evaluator";
import { createOgClient, pinnedModel } from "@/evaluator/og-client";
import { fetchSignatureEnvelope } from "@/evaluator/og-signature";
import { getSealedPayloads } from "@/app/room/[roomId]/write/actions";

import { runReveal, type RevealResult, type RevealTopicView } from "./run-reveal";
import { createInFlight } from "./in-flight";

// S3.21(b) · the in-process lock. Concurrent callers for the same room join the reveal
// already in flight instead of paying for another enclave call and writing another
// verdict message. Per-process only — see in-flight.ts for the honest limitation.
const revealsInFlight = createInFlight<RevealResult>();

/**
 * Run the reveal for a room with the real adapters. Concurrent calls for the same room
 * share one run (S3.21) — the first caller executes, the rest await the same result.
 *
 * Throws only on missing configuration. Every operational failure comes back as a typed
 * `RevealResult` — the caller's next move is to show a user something, and an exception
 * there becomes a blank screen instead of "no verdict, and here is why".
 */
export function revealRoom(roomId: string): Promise<RevealResult> {
  return revealsInFlight.run(roomId, () => runRevealWithAdapters(roomId));
}

async function runRevealWithAdapters(roomId: string): Promise<RevealResult> {
  const topicId = requireEnv("HEDERA_TOPIC_ID");
  const pinnedKey = requireEnv("OG_ENCLAVE_PUBKEY");
  const demoSecretHex = requireEnv("OG_DEMO_SEAL_SECRET");
  const model = pinnedModel() ?? requireEnv("OG_MODEL");

  const reader = createReader(hederaMirrorClient());
  const registry = createRegistry(hederaTopicClient());
  const ogClient = await createOgClient();
  const demoSecret = fromHex(demoSecretHex);

  return runReveal(
    { roomId, now: new Date().toISOString() },
    {
      async readRoom(id): Promise<RevealTopicView> {
        const view = await reader.readSession(topicId, { roomId: id });
        const parsedUseCase = useCaseIdSchema.safeParse(view.expiry?.useCase);
        return {
          commitments: view.commitments,
          // A room whose expiry predates D16 has no use case. Left undefined so
          // `runReveal` applies its documented default rather than guessing here.
          useCase: parsedUseCase.success ? parsedUseCase.data : undefined,
          hasExpiry: Boolean(view.expiry),
          hasVerdict: Boolean(view.verdict),
        };
      },

      sealedPayloads: getSealedPayloads,

      // ⚠️ THE HONEST SEAM (D-M6-2). `unseal-testkit` is named "testkit" because the spec
      // says Overlap never decrypts — decryption belongs inside the TEE. 0G's router is a chat
      // API, so until an enclave encryption key exists this is where it happens instead:
      // on our server, in memory, for the moment before the enclave call.
      //
      // Do not quietly rename this import to make it look like a production path. The name
      // is the warning, and the demo states the boundary rather than hiding it.
      unseal: (payload) => unseal(payload, demoSecret),

      evaluate: (input) => evaluate(input, { model: ogClient, pinnedModel: pinnedModel() }),

      async attestation() {
        const fetched = await fetchSignatureEnvelope({
          baseUrl: ogClient.signatureBaseUrl(),
          chatId: ogClient.lastChatId(),
          model,
        });
        return fetched.ok
          ? { ok: true, envelope: fetched.envelope }
          : { ok: false, detail: `${fetched.reason}${fetched.detail ? `: ${fetched.detail}` : ""}` };
      },

      pinnedKey,
      fallbackModelHash: env.OG_MODEL,

      async publishVerdict(message) {
        const { sequenceNumber } = await registry.publishVerdict(message);
        return { sequenceNumber };
      },
    },
  );
}
