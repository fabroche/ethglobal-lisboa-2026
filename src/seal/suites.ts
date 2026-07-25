/**
 * M2 · seal — cipher suites. See `docs/spec-04-seal.md` §3.
 *
 * Both suites are ECIES: ephemeral ECDH -> HKDF-SHA256 -> AES-256-GCM. The suite
 * is TAGGED in the payload and never inferred, because which key the 0G enclave
 * decrypts with is still an open booth question (spec-04 §8) — tagging makes the
 * answer a data change rather than a rewrite.
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import { x25519 } from "@noble/curves/ed25519";

export const SEAL_SUITES = [
  "x25519-hkdf-sha256-aes256gcm",
  "secp256k1-hkdf-sha256-aes256gcm",
] as const;

export type SealSuite = (typeof SEAL_SUITES)[number];

/** Modern default: HPKE-shaped, no point-validation footguns. */
export const DEFAULT_SUITE: SealSuite = "x25519-hkdf-sha256-aes256gcm";

export type Kem = {
  /** Bytes of a private scalar. */
  readonly secretLength: number;
  randomSecret(): Uint8Array;
  publicKey(secret: Uint8Array): Uint8Array;
  /** Raw ECDH shared secret. */
  sharedSecret(secret: Uint8Array, peerPublicKey: Uint8Array): Uint8Array;
  /** Throw if `key` is not a well-formed public key for this KEM. */
  assertPublicKey(key: Uint8Array): void;
};

const x25519Kem: Kem = {
  secretLength: 32,
  randomSecret: () => x25519.utils.randomPrivateKey(),
  publicKey: (secret) => x25519.getPublicKey(secret),
  sharedSecret: (secret, peer) => x25519.getSharedSecret(secret, peer),
  assertPublicKey: (key) => {
    if (key.length !== 32) {
      throw new Error(`x25519 public key must be 32 bytes, got ${key.length}`);
    }
  },
};

const secp256k1Kem: Kem = {
  secretLength: 32,
  randomSecret: () => secp256k1.utils.randomPrivateKey(),
  // Compressed (33 bytes) — one canonical encoding, so the value bound into the
  // HKDF info is unambiguous.
  publicKey: (secret) => secp256k1.getPublicKey(secret, true),
  sharedSecret: (secret, peer) => secp256k1.getSharedSecret(secret, peer, true),
  assertPublicKey: (key) => {
    if (key.length !== 33 && key.length !== 65) {
      throw new Error(
        `secp256k1 public key must be 33 or 65 bytes, got ${key.length}` +
          (key.length === 20 ? " — that looks like an ADDRESS; you cannot encrypt to an address" : ""),
      );
    }
    // Throws if the point is not on the curve.
    secp256k1.ProjectivePoint.fromHex(key).assertValidity();
  },
};

export function kemFor(suite: SealSuite): Kem {
  switch (suite) {
    case "x25519-hkdf-sha256-aes256gcm":
      return x25519Kem;
    case "secp256k1-hkdf-sha256-aes256gcm":
      return secp256k1Kem;
  }
}
