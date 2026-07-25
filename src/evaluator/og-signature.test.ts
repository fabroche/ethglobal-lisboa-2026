import { describe, it, expect } from "vitest";

import { fetchSignatureEnvelope, signatureUrl } from "./og-signature";

const OK_BODY = JSON.stringify({
  text: "abc123:def456",
  signature: "0xdeadbeef",
  signing_address: "0x0038f716958a90b753da6937787395e2365db2e8",
  signing_algo: "ecdsa",
});

function fakeFetch(status: number, body: string): typeof fetch {
  return (async () =>
    new Response(body, { status, statusText: status === 200 ? "OK" : "Error" })) as typeof fetch;
}

describe("signatureUrl", () => {
  it("builds from the BASE url even when handed an endpoint ending in /v1/proxy", () => {
    // `getServiceMetadata()` returns an endpoint that ALREADY ends in /v1/proxy.
    // Appending to that gives /v1/proxy/v1/proxy/… and an "unsupported endpoint"
    // error that reads like a wrong route. This trap cost a cycle in the spike.
    expect(signatureUrl("https://broker.example/v1/proxy", "chat-1", "m")).toBe(
      "https://broker.example/v1/proxy/signature/chat-1?model=m",
    );
    expect(signatureUrl("https://broker.example/v1/proxy/", "chat-1", "m")).toBe(
      "https://broker.example/v1/proxy/signature/chat-1?model=m",
    );
    expect(signatureUrl("https://broker.example", "chat-1", "m")).toBe(
      "https://broker.example/v1/proxy/signature/chat-1?model=m",
    );
  });

  it("escapes the model and chat id", () => {
    expect(signatureUrl("https://b.example", "a/b", "0gm-1.0/x")).toContain("a%2Fb");
    expect(signatureUrl("https://b.example", "a", "0gm-1.0/x")).toContain("model=0gm-1.0%2Fx");
  });
});

describe("fetchSignatureEnvelope", () => {
  const base = { baseUrl: "https://broker.example", chatId: "chat-1", model: "0gm-1.0-35b-a3b" };

  it("shapes a broker response into an envelope encoded as utf8", async () => {
    const result = await fetchSignatureEnvelope({ ...base, fetchImpl: fakeFetch(200, OK_BODY) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // LOAD-BEARING. 0G signs `text` as a raw string; canonicalising it wraps it in
    // JSON quotes and fails as `signer_mismatch` — which looks exactly like a wrongly
    // pinned key and is not one.
    expect(result.envelope.encoding).toBe("utf8");
    expect(result.envelope.payload).toBe("abc123:def456");
    expect(result.envelope.scheme).toBe("secp256k1-eth");
    expect(result.signedText).toBe("abc123:def456");
  });

  it("carries the signing address as evidence, never as authority", async () => {
    const result = await fetchSignatureEnvelope({ ...base, fetchImpl: fakeFetch(200, OK_BODY) });
    // `verifyEnvelope` recovers the signer from the signature itself and compares against
    // the PINNED key — this field is only ever a hint for diagnostics.
    expect(result.ok && result.claimedSigner).toBe("0x0038f716958a90b753da6937787395e2365db2e8");
  });

  it("records the URL as the attestation reference a third party can re-fetch", async () => {
    const result = await fetchSignatureEnvelope({ ...base, fetchImpl: fakeFetch(200, OK_BODY) });
    expect(result.ok && result.envelope.attestationRef).toContain("/v1/proxy/signature/chat-1");
  });

  it("fails when there is no chat id — a Router call can never produce one (DA10)", async () => {
    const result = await fetchSignatureEnvelope({ ...base, chatId: undefined });
    expect(result).toMatchObject({ ok: false, reason: "no_chat_id" });
  });

  it("fails when the broker url is unknown", async () => {
    const result = await fetchSignatureEnvelope({ ...base, baseUrl: undefined });
    expect(result).toMatchObject({ ok: false, reason: "no_broker_url" });
  });

  it("keeps the body on a business error, because that is what distinguishes it from a wrong route", async () => {
    const result = await fetchSignatureEnvelope({
      ...base,
      fetchImpl: fakeFetch(400, '{"error":"Chat id not found or expired, chat_id_not_found"}'),
    });
    expect(result).toMatchObject({ ok: false, reason: "broker_error" });
    // A wrong PATH returns 404 "page not found"; a wrong ID returns this. Same status
    // family, completely different fix.
    expect(result.ok === false && result.detail).toContain("chat_id_not_found");
  });

  it("rejects a 200 that is not the documented shape", async () => {
    const result = await fetchSignatureEnvelope({
      ...base,
      fetchImpl: fakeFetch(200, '{"signature":"0xabc"}'),
    });
    expect(result).toMatchObject({ ok: false, reason: "malformed_response" });
  });

  it("rejects a 200 that is not JSON at all", async () => {
    const result = await fetchSignatureEnvelope({ ...base, fetchImpl: fakeFetch(200, "<html>") });
    expect(result).toMatchObject({ ok: false, reason: "malformed_response" });
  });

  it("turns a network failure into a typed result, never a throw", async () => {
    const result = await fetchSignatureEnvelope({
      ...base,
      fetchImpl: (async () => {
        throw new Error("ECONNRESET");
      }) as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, reason: "network_error" });
  });
});
