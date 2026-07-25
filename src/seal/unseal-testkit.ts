/**
 * Test-only decryption, standing in for the 0G enclave.
 *
 * NOT A PRODUCTION PATH (spec-04 §9). Overlap never decrypts — that happens once,
 * inside the TEE, in enclave memory, and the plaintext is never persisted
 * ("the papers burn", `security-and-privacy.md` §f). This exists so the
 * round-trip is actually verified rather than assumed, and so the tamper tests
 * can show that AEAD catches a modified ciphertext.
 */
import { deriveKeyAndIv, fromHex, headerAad, type SealedPayload } from "./seal";
import { kemFor } from "./suites";

function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Generate a recipient keypair standing in for the enclave's decryption key. */
export function generateRecipient(suite: SealedPayload["suite"]): {
  secret: Uint8Array;
  publicKeyHex: string;
} {
  const kem = kemFor(suite);
  const secret = kem.randomSecret();
  const publicKey = kem.publicKey(secret);
  let hex = "";
  for (const byte of publicKey) hex += byte.toString(16).padStart(2, "0");
  return { secret, publicKeyHex: hex };
}

/** Decrypt a sealed payload. Throws if the AEAD tag does not verify. */
export async function unseal(payload: SealedPayload, recipientSecret: Uint8Array): Promise<string> {
  const kem = kemFor(payload.suite);
  const shared = kem.sharedSecret(recipientSecret, fromHex(payload.epk));
  const { key, iv } = deriveKeyAndIv(shared, payload.suite, payload.epk);

  const aad = headerAad({ v: payload.v, suite: payload.suite, epk: payload.epk });
  const cryptoKey = await globalThis.crypto.subtle.importKey("raw", buf(key), "AES-GCM", false, [
    "decrypt",
  ]);
  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buf(iv), additionalData: buf(aad), tagLength: 128 },
    cryptoKey,
    buf(fromHex(payload.ciphertext)),
  );
  return new TextDecoder().decode(plaintext);
}
