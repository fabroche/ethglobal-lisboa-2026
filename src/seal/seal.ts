/**
 * M2 · seal (client) — hybrid-encrypt a position to the enclave key.
 * See `docs/spec-04-seal.md`.
 *
 * ONE OF THE TWO HARD PARTS. Plaintext exists only in this tab's memory: it is
 * encrypted here and only ciphertext + a hash ever leave the browser (D5).
 *
 * Sealing is RANDOMIZED, deliberately. Making it deterministic across runs —
 * the literal reading of RNF-M2-001 — would leak equality of plaintexts on a
 * public topic and let an attacker confirm a guessed position offline by
 * comparing commitments. See spec-04 §1; the "differs across runs" unit test is
 * what stops that from being 'fixed'.
 */
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { z } from "zod";

import { canonicalize } from "../lib/canonical";
import { DEFAULT_SUITE, SEAL_SUITES, kemFor, type SealSuite } from "./suites";

export { DEFAULT_SUITE, SEAL_SUITES, type SealSuite };

/** Payload version. Bump when the wire format changes. */
export const SEAL_VERSION = 1;

const AES_KEY_BYTES = 32;
const IV_BYTES = 12;
const GCM_TAG_BITS = 128;

const hexString = z.string().regex(/^[0-9a-f]+$/u, "must be lowercase hex");

export const sealedPayloadSchema = z.object({
  v: z.literal(SEAL_VERSION),
  suite: z.enum(SEAL_SUITES),
  /** Ephemeral public key. */
  epk: hexString,
  /** AES-GCM output INCLUDING the 16-byte tag. */
  ciphertext: hexString,
});

export type SealedPayload = z.infer<typeof sealedPayloadSchema>;

export type SealResult = {
  sealedPayload: SealedPayload;
  /** sha256 of the ciphertext BYTES, 64 lowercase hex — see spec-04 §5. */
  commitment: string;
};

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

export function fromHex(value: string): Uint8Array {
  const hex = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (hex.length % 2 !== 0) throw new Error("odd-length hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`invalid hex at byte ${i}`);
    out[i] = byte;
  }
  return out;
}

/**
 * The bytes bound as AEAD additional data. Canonical (spec-03 §3) so both sides
 * agree byte-for-byte, and it covers the suite tag so it cannot be downgraded
 * without the GCM tag check failing.
 */
export function headerAad(header: Omit<SealedPayload, "ciphertext">): Uint8Array {
  return new TextEncoder().encode(canonicalize(header));
}

/**
 * Derive the content key and IV. The ephemeral public key goes into the HKDF
 * `info`, so a substituted `epk` derives a different key and decryption fails
 * rather than quietly succeeding on attacker-chosen material.
 *
 * The IV is DERIVED, not random and not zero: the AES key is unique per seal
 * (fresh ephemeral ECDH), so nonce reuse is impossible by construction.
 */
export function deriveKeyAndIv(
  sharedSecret: Uint8Array,
  suite: SealSuite,
  epkHex: string,
): { key: Uint8Array; iv: Uint8Array } {
  const info = new TextEncoder().encode(`seam/seal/v${SEAL_VERSION}|${suite}|${epkHex}`);
  const okm = hkdf(sha256, sharedSecret, undefined, info, AES_KEY_BYTES + IV_BYTES);
  return { key: okm.slice(0, AES_KEY_BYTES), iv: okm.slice(AES_KEY_BYTES) };
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error("WebCrypto unavailable — seal must run in a browser or Node >= 20");
  }
  return c.subtle;
}

/** `Uint8Array` -> the `BufferSource` WebCrypto wants, without a SharedArrayBuffer. */
function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export type SealOptions = {
  suite?: SealSuite;
  /**
   * TESTS ONLY. Injectable so fixtures are reproducible (spec-04 §1). Production
   * never passes this — reusing an ephemeral secret repeats the commitment,
   * which is exactly the leak randomization exists to prevent.
   */
  ephemeralSecret?: Uint8Array;
};

/**
 * Seal a plaintext position to the enclave's public key.
 *
 * @param plaintext        the user's position, in plain language
 * @param enclavePubKeyHex the enclave's ENCRYPTION key — NOT the attestation
 *                         address from `OG_ENCLAVE_PUBKEY` (spec-04 §2)
 */
export async function seal(
  plaintext: string,
  enclavePubKeyHex: string,
  opts: SealOptions = {},
): Promise<SealResult> {
  if (typeof plaintext !== "string" || plaintext.trim().length === 0) {
    throw new Error("cannot seal an empty position");
  }

  const suite = opts.suite ?? DEFAULT_SUITE;
  const kem = kemFor(suite);

  let recipient: Uint8Array;
  try {
    recipient = fromHex(enclavePubKeyHex);
  } catch (error) {
    throw new Error(`malformed enclave public key: ${(error as Error).message}`);
  }
  kem.assertPublicKey(recipient);

  const ephemeralSecret = opts.ephemeralSecret ?? kem.randomSecret();
  if (ephemeralSecret.length !== kem.secretLength) {
    throw new Error(`ephemeral secret must be ${kem.secretLength} bytes`);
  }

  const epk = toHex(kem.publicKey(ephemeralSecret));
  const shared = kem.sharedSecret(ephemeralSecret, recipient);
  const { key, iv } = deriveKeyAndIv(shared, suite, epk);

  const header = { v: SEAL_VERSION, suite, epk } as const;
  const cryptoKey = await subtle().importKey("raw", buf(key), "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await subtle().encrypt(
      { name: "AES-GCM", iv: buf(iv), additionalData: buf(headerAad(header)), tagLength: GCM_TAG_BITS },
      cryptoKey,
      buf(new TextEncoder().encode(plaintext)),
    ),
  );

  // Hash the ciphertext BYTES, not the hex string: hashing the hex would be
  // self-consistent but would silently disagree with any third-party verifier
  // that does the obvious thing (spec-04 §5).
  const commitment = toHex(sha256(ciphertext));

  const sealedPayload = sealedPayloadSchema.parse({ ...header, ciphertext: toHex(ciphertext) });
  return { sealedPayload, commitment };
}

/** Recompute a commitment from a sealed payload — what M4/M7 do (RF-M2-004). */
export function commitmentOf(payload: SealedPayload): string {
  return toHex(sha256(fromHex(payload.ciphertext)));
}
