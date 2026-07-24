/** M2 · seal — spec-04 §7 acceptance criteria as executable tests. */
import { describe, expect, it } from "vitest";

import { commitmentOf, fromHex, seal, SEAL_SUITES, type SealSuite } from "./seal";
import { generateRecipient, unseal } from "./unseal-testkit";
import { commitmentMessageSchema } from "../session/messages";

const POSITION = "We can start 1 March, 65k base, fully remote, 4 weeks notice.";

describe.each(SEAL_SUITES)("seal · %s", (suite: SealSuite) => {
  it("round-trips through the enclave's key", async () => {
    const enclave = generateRecipient(suite);
    const { sealedPayload } = await seal(POSITION, enclave.publicKeyHex, { suite });

    await expect(unseal(sealedPayload, enclave.secret)).resolves.toBe(POSITION);
  });

  it("produces a different ciphertext AND commitment for the same plaintext", async () => {
    // THE test of spec-04 §1. If someone "fixes" determinism the literal way,
    // this fails — and that fix would leak equality of plaintexts on a public
    // topic and let an attacker confirm a guessed position offline.
    const enclave = generateRecipient(suite);
    const first = await seal(POSITION, enclave.publicKeyHex, { suite });
    const second = await seal(POSITION, enclave.publicKeyHex, { suite });

    expect(first.sealedPayload.ciphertext).not.toBe(second.sealedPayload.ciphertext);
    expect(first.commitment).not.toBe(second.commitment);
    expect(first.sealedPayload.epk).not.toBe(second.sealedPayload.epk);
  });

  it("is byte-identical given a fixed ephemeral secret", async () => {
    const enclave = generateRecipient(suite);
    const ephemeralSecret = generateRecipient(suite).secret;

    const a = await seal(POSITION, enclave.publicKeyHex, { suite, ephemeralSecret });
    const b = await seal(POSITION, enclave.publicKeyHex, { suite, ephemeralSecret });

    expect(a.sealedPayload).toEqual(b.sealedPayload);
    expect(a.commitment).toBe(b.commitment);
  });

  it("commits to sha256 of the ciphertext bytes, recomputable from the payload alone", async () => {
    const enclave = generateRecipient(suite);
    const { sealedPayload, commitment } = await seal(POSITION, enclave.publicKeyHex, { suite });

    expect(commitment).toMatch(/^[0-9a-f]{64}$/u);
    expect(commitmentOf(sealedPayload)).toBe(commitment);
  });

  it("satisfies the HCS commitment message contract (interop with M1/M4)", async () => {
    const enclave = generateRecipient(suite);
    const { commitment } = await seal(POSITION, enclave.publicKeyHex, { suite });

    const message = commitmentMessageSchema.safeParse({
      v: 1,
      type: "commitment",
      roomId: "room-1",
      side: "A",
      commitment,
      worldNullifier: "nullifier-1",
      submittedAt: "2026-07-26T06:00:00Z",
    });
    expect(message.success).toBe(true);
  });

  it("fails to decrypt when one ciphertext byte is flipped (AEAD)", async () => {
    const enclave = generateRecipient(suite);
    const { sealedPayload, commitment } = await seal(POSITION, enclave.publicKeyHex, { suite });

    const bytes = fromHex(sealedPayload.ciphertext);
    bytes[0] = (bytes[0]! ^ 0x01) & 0xff;
    let flipped = "";
    for (const b of bytes) flipped += b.toString(16).padStart(2, "0");
    const tampered = { ...sealedPayload, ciphertext: flipped };

    await expect(unseal(tampered, enclave.secret)).rejects.toThrow();
    expect(commitmentOf(tampered)).not.toBe(commitment);
  });

  it("fails to decrypt when the ephemeral public key is substituted", async () => {
    const enclave = generateRecipient(suite);
    const { sealedPayload } = await seal(POSITION, enclave.publicKeyHex, { suite });
    const substituted = { ...sealedPayload, epk: generateRecipient(suite).publicKeyHex };

    await expect(unseal(substituted, enclave.secret)).rejects.toThrow();
  });

  it("fails to decrypt with the wrong recipient key", async () => {
    const enclave = generateRecipient(suite);
    const { sealedPayload } = await seal(POSITION, enclave.publicKeyHex, { suite });

    await expect(unseal(sealedPayload, generateRecipient(suite).secret)).rejects.toThrow();
  });

  it("never leaks the plaintext into the returned payload", async () => {
    const enclave = generateRecipient(suite);
    const result = await seal(POSITION, enclave.publicKeyHex, { suite });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("remote");
    expect(serialized).not.toContain("65k");
    expect(Object.keys(result.sealedPayload).sort()).toEqual(["ciphertext", "epk", "suite", "v"]);
  });
});

describe("seal · input validation", () => {
  it("refuses an empty or whitespace-only position", async () => {
    const enclave = generateRecipient("x25519-hkdf-sha256-aes256gcm");
    for (const bad of ["", "   ", "\n"]) {
      await expect(seal(bad, enclave.publicKeyHex)).rejects.toThrow(/empty position/u);
    }
  });

  it("refuses a malformed recipient key", async () => {
    await expect(seal(POSITION, "nothex")).rejects.toThrow(/malformed enclave public key/u);
    await expect(seal(POSITION, "abcd")).rejects.toThrow(/32 bytes/u);
  });

  it("names the mistake when handed a 20-byte attestation address", async () => {
    // spec-04 §2: OG_ENCLAVE_PUBKEY is an ADDRESS for secp256k1. Encrypting to
    // it is impossible, and the error should say so rather than fail obscurely.
    const address = "d8da6bf26964af9d7eed9e03e53415d37aa96045";
    await expect(
      seal(POSITION, address, { suite: "secp256k1-hkdf-sha256-aes256gcm" }),
    ).rejects.toThrow(/ADDRESS/u);
  });

  it("refuses an ephemeral secret of the wrong length", async () => {
    const enclave = generateRecipient("x25519-hkdf-sha256-aes256gcm");
    await expect(
      seal(POSITION, enclave.publicKeyHex, { ephemeralSecret: new Uint8Array(16) }),
    ).rejects.toThrow(/32 bytes/u);
  });

  it("does not accept a payload sealed under one suite as another", async () => {
    const enclave = generateRecipient("x25519-hkdf-sha256-aes256gcm");
    const { sealedPayload } = await seal(POSITION, enclave.publicKeyHex);
    const downgraded = { ...sealedPayload, suite: "secp256k1-hkdf-sha256-aes256gcm" as const };

    await expect(unseal(downgraded, enclave.secret)).rejects.toThrow();
  });
});
