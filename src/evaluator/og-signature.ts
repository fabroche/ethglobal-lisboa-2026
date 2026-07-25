/**
 * M7 · fetch the enclave's signature for a call we made, and shape it into an
 * {@link Envelope} that `verifyEnvelope` can judge (S2.9).
 *
 * The signature is NOT part of the chat response. It is served separately, keyed by
 * the chatID of a call the broker has a record of us making:
 *
 *   GET {base}/v1/proxy/signature/{chatID}?model={model}
 *     -> { text, signature, signing_address, signing_algo }
 *
 * Route and shape were read out of `@0gfoundation/0g-compute-ts-sdk`
 * (`inference/broker/verifier.js`), which we inspected and deliberately do not depend
 * on: nothing in the trust path comes from 0G (RNF-M7-001). This module only fetches
 * and parses — the judging happens in `attest.ts` with `@noble/*`.
 *
 * Two traps are encoded here because both cost us real time in the spike:
 *
 * 1. **The Router can never serve this.** It pays the broker with its own wallet, so
 *    the broker's customer is the Router and a chatID from a Router call comes back
 *    `chat_id_not_found` — correct behaviour, not a bug (DA10).
 * 2. **`encoding: "utf8"` is load-bearing.** 0G signs `text` as a raw string.
 *    Canonicalising it wraps it in JSON quotes, the bytes stop matching, and it fails
 *    as `signer_mismatch` — indistinguishable at a glance from a wrongly pinned key.
 */
import { z } from "zod";

import { DEFAULT_SCHEME, type Envelope } from "./attest";

/** What the broker returns. Validated, because an external response is untrusted (D11). */
const brokerSignatureSchema = z.object({
  /** The signed bytes: `sha256(input):sha256(response)`. Signed as a RAW STRING. */
  text: z.string().min(1),
  signature: z.string().min(1),
  /** Evidence of who signed, never authority — `verifyEnvelope` recovers it itself. */
  signing_address: z.string().optional(),
  signing_algo: z.string().optional(),
});

export type FetchSignatureResult =
  | { ok: true; envelope: Envelope; signedText: string; claimedSigner: string | undefined }
  | { ok: false; reason: FetchSignatureFailure; detail?: string };

export type FetchSignatureFailure =
  /** No chatID — the call never happened, or it went through the Router (DA10). */
  | "no_chat_id"
  | "no_broker_url"
  /** The broker answered, but not with a signature (404, chat_id_not_found, …). */
  | "broker_error"
  /** Reached the broker but the body is not the documented shape. */
  | "malformed_response"
  | "network_error";

function fail(reason: FetchSignatureFailure, detail?: string): FetchSignatureResult {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

export interface FetchSignatureInput {
  /** From `OgClient.signatureBaseUrl()` — the BASE url, without `/v1/proxy`. */
  baseUrl: string | undefined;
  /** From `OgClient.lastChatId()`. */
  chatId: string | undefined;
  model: string;
  timeoutMs?: number;
  /** Injected so this is testable without a network. */
  fetchImpl?: typeof fetch;
}

/** Build the signature URL. Exported for the test that pins the doubled-prefix trap. */
export function signatureUrl(baseUrl: string, chatId: string, model: string): string {
  const base = baseUrl.replace(/\/v1\/proxy\/?$/u, "").replace(/\/$/u, "");
  return `${base}/v1/proxy/signature/${encodeURIComponent(chatId)}?model=${encodeURIComponent(model)}`;
}

export async function fetchSignatureEnvelope(
  input: FetchSignatureInput,
): Promise<FetchSignatureResult> {
  if (!input.chatId) return fail("no_chat_id");
  if (!input.baseUrl) return fail("no_broker_url");

  const doFetch = input.fetchImpl ?? fetch;
  const url = signatureUrl(input.baseUrl, input.chatId, input.model);

  let response: Response;
  let raw: string;
  try {
    response = await doFetch(url, { signal: AbortSignal.timeout(input.timeoutMs ?? 30_000) });
    raw = await response.text();
  } catch (error) {
    return fail("network_error", error instanceof Error ? error.message : String(error));
  }

  if (!response.ok) {
    // A wrong path returns 404 "page not found"; a wrong id returns a *business*
    // error. Keeping the body (capped) is what tells those two apart at 3am.
    return fail("broker_error", `HTTP ${response.status}: ${raw.slice(0, 200)}`);
  }

  let parsed: z.infer<typeof brokerSignatureSchema>;
  try {
    parsed = brokerSignatureSchema.parse(JSON.parse(raw));
  } catch (error) {
    return fail("malformed_response", error instanceof Error ? error.message : String(error));
  }

  return {
    ok: true,
    signedText: parsed.text,
    claimedSigner: parsed.signing_address,
    envelope: {
      payload: parsed.text,
      // See the header note: canonicalising this is the failure that masquerades
      // as a wrongly pinned key.
      encoding: "utf8",
      signature: parsed.signature,
      scheme: DEFAULT_SCHEME,
      ...(parsed.signing_address === undefined ? {} : { signer: parsed.signing_address }),
      model: input.model,
      attestationRef: url,
    },
  };
}
