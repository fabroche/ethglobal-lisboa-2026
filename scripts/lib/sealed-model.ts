/**
 * Build a `SealedModel` for use from a SCRIPT (spike, eval:live, demo:naive).
 *
 * Exists for two reasons, both of them annoying:
 *
 * 1. `src/evaluator/og-client.ts` is marked `server-only`, which throws under
 *    `tsx`. Scripts therefore cannot use the production adapter directly — the
 *    same reason `inspect.ts` and `seed-room.ts` wire Hedera by hand.
 * 2. The 0G SDK's ESM bundle breaks under **dynamic** import ("does not provide an
 *    export named 'C'"), so it has to be imported statically. That bit me three
 *    times in one afternoon before it earned its own module.
 *
 * What is NOT duplicated here is anything that matters: the request body comes
 * from `og-request.ts` and validation stays in `evaluate.ts`, so a script exercises
 * the real code path rather than a look-alike. The only thing reimplemented is the
 * plumbing.
 */
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import { ethers } from "ethers";

import type { SealedModel } from "../../src/evaluator/evaluate";
import { buildChatRequest, readChatCompletion, signatureBaseFrom } from "../../src/evaluator/og-request";

/** 0G mainnet (DA8). */
export const OG_RPC = "https://evmrpc.0g.ai";
/** Sole provider for the pinned model (DA6) — why the signing key cannot rotate. */
export const DEFAULT_PROVIDER = "0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9";

export interface ScriptSealedModel extends SealedModel {
  /** Exact model id the provider serves — carries a snapshot suffix (e.g. `-0427`). */
  readonly servedModel: string;
  /** Base URL for `/v1/proxy/signature/{chatID}`. */
  readonly signatureBase: string;
  /** chatID of the most recent call, for fetching its signature. */
  lastChatId(): string | undefined;
}

export interface BuildOptions {
  privateKey: string;
  providerAddress?: string;
  timeoutMs?: number;
}

/** Reject a malformed key before it reaches ethers, whose error is less clear. */
export function looksLikePrivateKey(key: string): boolean {
  return /^(0x)?[0-9a-fA-F]{64}$/u.test(key.trim());
}

export async function buildSealedModel(options: BuildOptions): Promise<ScriptSealedModel> {
  const provider = options.providerAddress ?? DEFAULT_PROVIDER;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const key = options.privateKey.trim();

  const wallet = new ethers.Wallet(
    key.startsWith("0x") ? key : `0x${key}`,
    new ethers.JsonRpcProvider(OG_RPC),
  );
  const broker = await createZGComputeNetworkBroker(wallet);
  const { endpoint, model } = await broker.inference.getServiceMetadata(provider);

  let chatId: string | undefined;

  return {
    servedModel: model,
    signatureBase: signatureBaseFrom(endpoint),
    lastChatId: () => chatId,

    async complete(request) {
      // Fresh per call: these headers carry the micropayment for THIS request.
      const headers = await broker.inference.getRequestHeaders(provider);
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers as unknown as Record<string, string>),
        },
        body: JSON.stringify(
          buildChatRequest({
            model,
            system: request.system,
            user: request.user,
            responseFormat: request.responseFormat,
          }),
        ),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const raw = await response.text();
      if (!response.ok) {
        // The provider's error, not model output — safe to surface, and it is where
        // "insufficient balance" shows up.
        throw new Error(`0G broker HTTP ${response.status}: ${raw.slice(0, 200)}`);
      }

      const body = JSON.parse(raw) as Parameters<typeof readChatCompletion>[0];
      chatId = response.headers.get("zg-res-key") ?? body.id;
      return readChatCompletion(body);
    },
  };
}
