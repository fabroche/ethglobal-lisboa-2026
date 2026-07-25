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

/** A Seam-shaped verdict record — what the enclave actually signs. */
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
