/**
 * M6 · the 0G adapter — the only file in `evaluator/` that talks to 0G.
 *
 * Isolated on purpose: `evaluate.ts` holds the logic and is fully unit-tested
 * against a fake, so nothing here needs a network to be reasoned about. This is
 * the seam the spike exercises live (`npm run spike`).
 *
 * WHY DIRECT TO THE BROKER, NOT THE ROUTER (DA10). The Router accepts a Bearer
 * key and is far simpler — but it pays the broker with its OWN wallet, so the
 * broker's customer is the Router, not us, and it will not serve a signature for
 * a call it has no record of us making. No signature means no attestation, and
 * fail-closed means no verdict. Being the paying customer is the price of being
 * able to verify.
 *
 * THE SDK'S ROLE, precisely: payment and transport. It moves funds, signs the
 * per-request billing headers, and tells us which URL to hit. It never judges a
 * signature — that stays in `attest.ts` with `@noble/*` (RNF-M7-001), and
 * `processResponse()` is deliberately never called.
 */
import "server-only";

import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import { ethers } from "ethers";

import { env, requireEnv } from "../config/env";

import {
  buildChatRequest,
  readChatCompletion,
  signatureBaseFrom,
  type RawChatCompletion,
} from "./og-request";

import type { SealedModel, SealedModelResponse } from "./evaluate";

/** 0G mainnet (DA8). Chain id 16661. */
const OG_RPC = "https://evmrpc.0g.ai";
/** Sole provider for the pinned model (DA6) — why the signing key cannot rotate. */
const DEFAULT_PROVIDER = "0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9";

export interface OgClient extends SealedModel {
  /**
   * The handle the signature is fetched with, set by the most recent call.
   *
   * Deliberately not returned from `complete()`: `SealedModel` is the port
   * `evaluate.ts` depends on, and attestation is M7's concern, not M6's. Keeping
   * it off the port stops the two from tangling.
   */
  lastChatId(): string | undefined;
  /** Base URL for `/v1/proxy/signature/{chatID}` (M7 reads it from here). */
  signatureBaseUrl(): string | undefined;
}

export interface OgClientOptions {
  providerAddress?: string;
  /** Per-call ceiling. Small: the answer is one word (D9). */
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Build the sealed-model client.
 *
 * Async because the broker is constructed from on-chain state. Build it ONCE per
 * process and reuse it — construction costs RPC round-trips and can trigger a
 * funding transaction.
 */
export async function createOgClient(options: OgClientOptions = {}): Promise<OgClient> {
  const provider = options.providerAddress ?? DEFAULT_PROVIDER;
  const maxTokens = options.maxTokens ?? 16;
  const timeoutMs = options.timeoutMs ?? 120_000;

  const wallet = new ethers.Wallet(
    normalizeKey(requireEnv("OG_WALLET_PRIVATE_KEY")),
    new ethers.JsonRpcProvider(OG_RPC),
  );
  const broker = await createZGComputeNetworkBroker(wallet);
  const { endpoint, model } = await broker.inference.getServiceMetadata(provider);
  const base = signatureBaseFrom(endpoint);

  let chatId: string | undefined;

  return {
    lastChatId: () => chatId,
    signatureBaseUrl: () => base,

    async complete(request): Promise<SealedModelResponse> {
      // Fresh per call: these headers carry the micropayment for THIS request.
      const headers = await broker.inference.getRequestHeaders(provider);

      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers as unknown as Record<string, string>) },
        body: JSON.stringify(
          buildChatRequest({
            model,
            system: request.system,
            user: request.user,
            responseFormat: request.responseFormat,
            maxTokens,
          }),
        ),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const raw = await response.text();
      if (!response.ok) {
        // The body is the provider's error, not model output, so it is safe to
        // surface — and it is where "insufficient balance" shows up.
        throw new Error(`0G broker HTTP ${response.status}: ${raw.slice(0, 200)}`);
      }

      let body: RawChatCompletion;
      try {
        body = JSON.parse(raw) as RawChatCompletion;
      } catch {
        throw new Error("0G broker returned a body that is not JSON");
      }

      chatId = response.headers.get("zg-res-key") ?? body.id;
      return readChatCompletion(body);
    },
  };
}

/** `OG_MODEL` as pinned, for the model-mismatch check in `evaluate`. */
export function pinnedModel(): string | undefined {
  return env.OG_MODEL;
}

function normalizeKey(key: string): string {
  const trimmed = key.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}
