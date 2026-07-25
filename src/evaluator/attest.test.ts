/**
 * M7 · attest — spec-03 §7 acceptance criteria as executable tests.
 *
 * The point of these is not coverage. It is that "fail closed" is a property
 * someone can check in ten seconds, and that a passing signature check is
 * narrow: it must reject a tampered payload, a tampered signature, and a valid
 * signature made by the wrong key.
 */
import { describe, expect, it } from "vitest";

import { generateEnclaveKey, signEnvelope, tamperHex } from "./attest-testkit";
import { mayPublish, verifyEnvelope, type SignatureScheme } from "./attest";

/** A Overlap-shaped verdict record — what the enclave actually signs. */
const VERDICT = {
  sessionId: "seam-0xdeadbeef",
  verdict: "workable",
  model: "pinned-model-v1",
  commitments: {
    a: "b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78",
    b: "3f79bb7b435b05321651daefd374cdc681dc06faa65e374e38337b88ca046dea",
  },
} as const;

const SCHEMES: SignatureScheme[] = ["secp256k1-eth", "secp256k1-raw", "ed25519"];

describe.each(SCHEMES)("verifyEnvelope · %s", (scheme) => {
  it("accepts a genuine signature (the offline self-test)", () => {
    const key = generateEnclaveKey(scheme);
    const result = verifyEnvelope(signEnvelope(VERDICT, key), key.pinned);

    expect(result).toMatchObject({ verified: true, scheme });
    expect(mayPublish(result)).toBe(true);
  });

  it("rejects one flipped byte in the payload (demo Act 4)", () => {
    const key = generateEnclaveKey(scheme);
    const envelope = signEnvelope(VERDICT, key);
    const tampered = { ...envelope, payload: { ...VERDICT, verdict: "not_workable" } };

    const result = verifyEnvelope(tampered, key.pinned);
    expect(result.verified).toBe(false);
    expect(mayPublish(result)).toBe(false);
  });

  it("rejects one flipped byte in the signature", () => {
    const key = generateEnclaveKey(scheme);
    const envelope = signEnvelope(VERDICT, key);
    const tampered = { ...envelope, signature: tamperHex(envelope.signature, 5) };

    expect(verifyEnvelope(tampered, key.pinned).verified).toBe(false);
  });

  it("rejects a valid signature made by a different key", () => {
    const signingKey = generateEnclaveKey(scheme);
    const otherKey = generateEnclaveKey(scheme);
    const envelope = signEnvelope(VERDICT, signingKey);

    // Strip the claimed signer so the check must come from the crypto, not
    // from comparing two strings in the response.
    const result = verifyEnvelope({ ...envelope, signer: undefined }, otherKey.pinned);
    expect(result.verified).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringMatching(/signer_mismatch|signature_invalid/u) });
  });

  it("is insensitive to key ordering in the payload", () => {
    const key = generateEnclaveKey(scheme);
    const envelope = signEnvelope(VERDICT, key);
    const reordered = {
      commitments: { b: VERDICT.commitments.b, a: VERDICT.commitments.a },
      model: VERDICT.model,
      verdict: VERDICT.verdict,
      sessionId: VERDICT.sessionId,
    };

    expect(verifyEnvelope({ ...envelope, payload: reordered }, key.pinned).verified).toBe(true);
  });
});

describe("verifyEnvelope · fail-closed contract", () => {
  const key = generateEnclaveKey("secp256k1-eth");

  it("never throws, whatever it is handed", () => {
    const garbage: unknown[] = [
      null,
      undefined,
      42,
      "not an envelope",
      [],
      {},
      { payload: {}, signature: "0xzz" },
      { payload: {}, signature: "0x1234", scheme: "rot13" },
      { payload: { v: 1.5 }, signature: "0x1234" },
      { payload: {}, signature: "0x" },
    ];

    for (const input of garbage) {
      expect(() => verifyEnvelope(input, key.pinned)).not.toThrow();
      expect(verifyEnvelope(input, key.pinned).verified).toBe(false);
    }
  });

  it("refuses when no key is pinned — absence is not permission", () => {
    const envelope = signEnvelope(VERDICT, key);
    for (const pinned of ["", "0x", "   "]) {
      expect(verifyEnvelope(envelope, pinned)).toMatchObject({
        verified: false,
        reason: "missing_signer",
      });
    }
  });

  it("reports a non-canonical payload rather than crashing", () => {
    const envelope = signEnvelope(VERDICT, key);
    expect(verifyEnvelope({ ...envelope, payload: { at: 1.5 } }, key.pinned)).toMatchObject({
      reason: "not_canonical",
    });
  });

  it("rejects an envelope claiming a signer other than the pinned key", () => {
    const other = generateEnclaveKey("secp256k1-eth");
    const envelope = signEnvelope(VERDICT, key, { signer: other.pinned });

    expect(verifyEnvelope(envelope, key.pinned)).toMatchObject({ reason: "signer_mismatch" });
  });

  it("rejects a 64-byte signature — no brute-forcing the recovery id", () => {
    const envelope = signEnvelope(VERDICT, key);
    const noRecoveryByte = envelope.signature.slice(0, 2 + 128);

    expect(verifyEnvelope({ ...envelope, signature: noRecoveryByte }, key.pinned)).toMatchObject({
      reason: "malformed_signature",
    });
  });

  it("rejects a pinned key of the wrong length for the scheme", () => {
    const envelope = signEnvelope(VERDICT, key);
    expect(verifyEnvelope(envelope, "0xdeadbeef")).toMatchObject({ reason: "signer_mismatch" });
    expect(verifyEnvelope({ ...envelope, signer: undefined }, "0xdeadbeef")).toMatchObject({
      reason: "malformed_signer",
    });
  });

  it("does not accept a raw-scheme signature under the eth scheme", () => {
    // The EIP-191 prefix is unconfirmed at the provider (booth question 2).
    // If the two schemes were interchangeable, trying both in the spike would
    // be meaningless — this proves they are distinct digests.
    const raw = generateEnclaveKey("secp256k1-raw");
    const envelope = signEnvelope(VERDICT, raw);

    expect(verifyEnvelope({ ...envelope, scheme: "secp256k1-eth" }, raw.pinned).verified).toBe(false);
  });

  it("accepts a hex signature without the 0x prefix", () => {
    const envelope = signEnvelope(VERDICT, key);
    const bare = { ...envelope, signature: envelope.signature.slice(2) };

    expect(verifyEnvelope(bare, key.pinned.slice(2)).verified).toBe(true);
  });

  it("carries attestationRef through so the raw quote stays reachable", () => {
    const envelope = signEnvelope(VERDICT, key, { attestationRef: "https://0g.example/quote/1" });
    expect(verifyEnvelope(envelope, key.pinned).verified).toBe(true);
  });
});

/**
 * The real 0G wire format, confirmed live on 25 Jul against provider
 * 0x4870CbC4… on mainnet. The broker signs `sha256(input):sha256(response)` as a
 * RAW STRING, so these bytes must not go through canonical serialisation.
 */
describe("verifyEnvelope · utf8 encoding (0G's real wire format)", () => {
  /** Captured verbatim from GET /v1/proxy/signature/{chatID}. Not synthetic. */
  const REAL = {
    text: "bdb8808ad8b37b6be2e2760ccfa9004bc1a0b60eca7b7c29301932e5016aef21:d746c179da80393d93eab12b55cc68cea6dc4c3136bc23b0f4ea5a480e0b1648",
    signature:
      "0xab67a562d37c7fe7e638baf611b1e1f4b1a9ed053a8ffddeb6ba6895ef21dcf73cfcaef044a777cd46888a19f3ada923f7c95cd75658144b9eb08dfc631f65521c",
    signingAddress: "0x0038f716958a90b753da6937787395e2365db2e8",
  };

  it("verifies a real enclave signature against the pinned teeSignerAddress", () => {
    const result = verifyEnvelope(
      { payload: REAL.text, encoding: "utf8", signature: REAL.signature, scheme: "secp256k1-eth" },
      REAL.signingAddress,
    );

    expect(result).toMatchObject({ verified: true, scheme: "secp256k1-eth" });
    expect(mayPublish(result)).toBe(true);
  });

  it("rejects the same real signature under canonical encoding", () => {
    // The regression that cost us an afternoon: canonicalising a string wraps it
    // in JSON quotes, so the bytes stop being what the enclave hashed and the
    // failure surfaces as `signer_mismatch` — indistinguishable, at a glance,
    // from having pinned the wrong key. Encoding is explicit for this reason.
    const result = verifyEnvelope(
      { payload: REAL.text, encoding: "canonical", signature: REAL.signature, scheme: "secp256k1-eth" },
      REAL.signingAddress,
    );

    expect(result).toMatchObject({ verified: false, reason: "signer_mismatch" });
  });

  it("still rejects a tampered real payload", () => {
    const result = verifyEnvelope(
      {
        payload: REAL.text.replace(/^b/u, "c"),
        encoding: "utf8",
        signature: REAL.signature,
        scheme: "secp256k1-eth",
      },
      REAL.signingAddress,
    );

    expect(result.verified).toBe(false);
  });

  it("refuses a non-string payload rather than stringifying it", () => {
    // String({}) is "[object Object]", which would hash to something stable and
    // verify nothing. Fail loudly instead.
    const result = verifyEnvelope(
      { payload: { a: 1 }, encoding: "utf8", signature: REAL.signature, scheme: "secp256k1-eth" },
      REAL.signingAddress,
    );

    expect(result).toMatchObject({ verified: false, reason: "payload_not_text" });
  });

  it("round-trips through the testkit under utf8", () => {
    const utf8Key = generateEnclaveKey("secp256k1-eth");
    const envelope = signEnvelope("some:raw:string", utf8Key, {}, "utf8");

    expect(verifyEnvelope(envelope, utf8Key.pinned).verified).toBe(true);
  });

  it("defaults to canonical when encoding is absent", () => {
    // Every existing caller and fixture omits it; they must keep working.
    const localKey = generateEnclaveKey("secp256k1-eth");
    const envelope = signEnvelope(VERDICT, localKey);
    const { encoding: _dropped, ...withoutEncoding } = envelope;

    expect(verifyEnvelope(withoutEncoding, localKey.pinned).verified).toBe(true);
  });
});
