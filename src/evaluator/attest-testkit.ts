/**
 * Signing helpers for the S0.3 spike and the unit tests.
 *
 * NOT A PRODUCTION PATH. Seam never signs anything — the enclave does. This
 * exists so the offline self-test can prove `verifyEnvelope` is correct without
 * 0G being reachable, and so the spike and the tests share one implementation
 * instead of drifting apart.
 *
 * Every key here is ephemeral and generated in-process. No user key is ever
 * involved, in this file or anywhere else (D8).
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";

import { addressFromPublicKey, digestFor, type Envelope, type SignatureScheme } from "./attest";
import { canonicalBytes } from "../lib/canonical";

export type TestKeyPair = {
  scheme: SignatureScheme;
  privateKey: Uint8Array;
  /** What `OG_ENCLAVE_PUBKEY` would hold for this key: an address, or a pubkey. */
  pinned: string;
};

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** A throwaway keypair standing in for the enclave's in-TEE signing key. */
export function generateEnclaveKey(scheme: SignatureScheme): TestKeyPair {
  if (scheme === "ed25519") {
    const privateKey = ed25519.utils.randomPrivateKey();
    return { scheme, privateKey, pinned: `0x${toHex(ed25519.getPublicKey(privateKey))}` };
  }
  const privateKey = secp256k1.utils.randomPrivateKey();
  const pinned = addressFromPublicKey(secp256k1.getPublicKey(privateKey, false));
  return { scheme, privateKey, pinned: `0x${pinned}` };
}

/** Sign a payload the way we believe the enclave signs it. */
export function signEnvelope(
  payload: unknown,
  key: TestKeyPair,
  extra: Partial<Pick<Envelope, "model" | "attestationRef" | "signer">> = {},
): Envelope {
  const message = digestFor(key.scheme, canonicalBytes(payload));

  let signature: string;
  if (key.scheme === "ed25519") {
    signature = `0x${toHex(ed25519.sign(message, key.privateKey))}`;
  } else {
    const sig = secp256k1.sign(message, key.privateKey);
    // 65 bytes: r||s||v, with v in Ethereum's 27/28 form.
    signature = `0x${sig.toCompactHex()}${(sig.recovery + 27).toString(16).padStart(2, "0")}`;
  }

  return {
    payload,
    signature,
    scheme: key.scheme,
    signer: key.pinned,
    ...extra,
  };
}

/** Flip one bit of one byte of a hex string — the tamper test. */
export function tamperHex(hex: string, byteIndex = 0): string {
  const prefix = hex.startsWith("0x") ? "0x" : "";
  const body = prefix ? hex.slice(2) : hex;
  const at = byteIndex * 2;
  const byte = Number.parseInt(body.slice(at, at + 2), 16);
  const flipped = (byte ^ 0x01).toString(16).padStart(2, "0");
  return `${prefix}${body.slice(0, at)}${flipped}${body.slice(at + 2)}`;
}
