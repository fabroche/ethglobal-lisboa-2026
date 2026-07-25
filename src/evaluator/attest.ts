/**
 * M7 · attest — independent TEE attestation verification. See `docs/spec-03-attest.md`.
 *
 * THE CORE CLAIM. A verdict is only publishable if we can show it came out of
 * the sealed enclave. Receiving `{ valid: true }` from a vendor SDK proves
 * nothing — that SDK is precisely the thing we are trying not to trust
 * (RNF-M7-001). So we re-derive the signer from the signature ourselves, using
 * general-purpose crypto only, and compare it to a key pinned out-of-band.
 *
 * NOTHING from 0G is in this trust path. `@noble/*` are general-purpose curve
 * and hash implementations; the 0G SDK may deliver the bytes but never gets to
 * tell us whether they are good.
 *
 * Scope, stated plainly (spec-03 §5): we verify the LAST link of the chain
 * (response signature -> enclave signing key) and PIN the third
 * (`OG_ENCLAVE_PUBKEY`, read once from the provider's attestation endpoint).
 * Parsing a raw TDX quote and walking its certificate chain to an Intel root is
 * out of scope. Claiming otherwise in the Q&A is how this demo loses.
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";
import { keccak_256 } from "@noble/hashes/sha3";
import { z } from "zod";

import { canonicalBytes, NotCanonicalError } from "../lib/canonical";

/** Signature schemes, spec-03 §4. Always explicit — never inferred from length. */
export const SIGNATURE_SCHEMES = ["secp256k1-eth", "secp256k1-raw", "ed25519"] as const;
export type SignatureScheme = (typeof SIGNATURE_SCHEMES)[number];

/** 0G Compute providers sign Ethereum-style. Whether the EIP-191 prefix is
 *  applied is unconfirmed (booth question 2) — the spike tries both. */
export const DEFAULT_SCHEME: SignatureScheme = "secp256k1-eth";

const hexString = z
  .string()
  .trim()
  .regex(/^(0x)?[0-9a-fA-F]*$/u, "not hex")
  .refine((s) => (s.startsWith("0x") ? s.length : s.length + 2) % 2 === 0, "odd-length hex");

/**
 * How the payload becomes the bytes that were signed.
 *
 * `canonical` — serialise per spec-03 §3. Correct for anything WE construct: two
 * machines must agree byte-for-byte regardless of key order.
 *
 * `utf8` — the payload is already the exact string that was signed; encode it and
 * do nothing else. Required by the real 0G wire format, confirmed live on 25 Jul:
 * the broker signs `sha256(input):sha256(response)` as a raw string. Canonicalising
 * that wraps it in JSON quotes, which are not the bytes the enclave hashed, and
 * verification fails with `signer_mismatch` — a failure that reads exactly like a
 * wrong key and is not one. Hence an explicit field rather than a guess.
 */
export const PAYLOAD_ENCODINGS = ["canonical", "utf8"] as const;
export type PayloadEncoding = (typeof PAYLOAD_ENCODINGS)[number];

/** Envelope shape, spec-03 §2. Validated here (D11) — a malformed response is a
 *  verification failure, never a crash. */
export const envelopeSchema = z.object({
  /** Exactly what the enclave signed over. For Seam: the verdict record. */
  payload: z.unknown(),
  /** Defaults to `canonical` so existing callers and fixtures are unaffected. */
  encoding: z.enum(PAYLOAD_ENCODINGS).default("canonical"),
  signature: hexString,
  /** What the response CLAIMS signed it. Evidence, not authority. */
  signer: hexString.optional(),
  scheme: z.enum(SIGNATURE_SCHEMES).default(DEFAULT_SCHEME),
  /** Pinned model id, echoed back. */
  model: z.string().optional(),
  /** URL/id of the raw CPU+GPU quote, stored with the verdict (RF-M7-005) so a
   *  third party can walk the links we did not. */
  attestationRef: z.string().optional(),
});

export type Envelope = z.infer<typeof envelopeSchema>;

export type AttestFailure =
  /** `encoding: "utf8"` but the payload is not a string — nothing to encode. */
  | "payload_not_text"
  | "missing_signature"
  | "missing_signer"
  | "malformed_signature"
  | "malformed_signer"
  | "unsupported_scheme"
  | "malformed_envelope"
  /** Recovered a key, but not the pinned one. The interesting failure. */
  | "signer_mismatch"
  | "signature_invalid"
  | "malleable_signature"
  | "not_canonical";

/**
 * Discriminated union, not a boolean — spec-03 §6. A bare boolean invites
 * `if (!res)` to be forgotten and `catch {}` to silently mean "fine".
 * Note `{ verified: false }` is itself truthy: callers MUST branch on
 * `result.verified === true`, which is what the discriminant forces.
 */
export type AttestResult =
  | { verified: true; scheme: SignatureScheme; signer: string }
  | { verified: false; reason: AttestFailure; detail?: string };

function fail(reason: AttestFailure, detail?: string): AttestResult {
  return detail === undefined ? { verified: false, reason } : { verified: false, reason, detail };
}

function stripHex(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed.slice(2) : trimmed;
}

function hexToBytes(value: string): Uint8Array {
  const hex = stripHex(value);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`invalid hex at byte ${i}`);
    out[i] = byte;
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** Ethereum address: last 20 bytes of keccak256 of the uncompressed pubkey
 *  minus its 0x04 tag. Lowercase hex, no checksum — we compare case-insensitively. */
export function addressFromPublicKey(publicKey: Uint8Array): string {
  const uncompressed =
    publicKey.length === 65 ? publicKey.subarray(1) : secp256k1.ProjectivePoint.fromHex(publicKey).toRawBytes(false).subarray(1);
  return bytesToHex(keccak_256(uncompressed).subarray(-20));
}

/** EIP-191 personal-sign framing: keccak256("\x19Ethereum Signed Message:\n" + len + msg). */
export function eip191Digest(message: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${message.length}`);
  const framed = new Uint8Array(prefix.length + message.length);
  framed.set(prefix, 0);
  framed.set(message, prefix.length);
  return keccak_256(framed);
}

/** The digest a given scheme signs over. `ed25519` hashes internally, so it
 *  gets the raw canonical bytes. */
export function digestFor(scheme: SignatureScheme, message: Uint8Array): Uint8Array {
  switch (scheme) {
    case "secp256k1-eth":
      return eip191Digest(message);
    case "secp256k1-raw":
      return keccak_256(message);
    case "ed25519":
      return message;
  }
}

function verifySecp256k1(
  scheme: "secp256k1-eth" | "secp256k1-raw",
  signature: Uint8Array,
  message: Uint8Array,
  pinned: string,
): AttestResult {
  // 65 = r||s||v. 64 (r||s, no recovery id) cannot be recovered from, and we
  // refuse to brute-force both candidates: that would let a signature verify
  // against a key it was not made with half the time by luck of iteration.
  if (signature.length !== 65) {
    return fail("malformed_signature", `expected 65 bytes (r||s||v), got ${signature.length}`);
  }

  const rawV = signature[64]!;
  const recovery = rawV >= 27 ? rawV - 27 : rawV;
  if (recovery !== 0 && recovery !== 1) {
    return fail("malformed_signature", `bad recovery id: ${rawV}`);
  }

  let sig;
  try {
    sig = secp256k1.Signature.fromCompact(signature.subarray(0, 64)).addRecoveryBit(recovery);
  } catch (error) {
    return fail("malformed_signature", error instanceof Error ? error.message : String(error));
  }

  // Reject high-s (spec-03 §4). Malleability is not a safety hole here, but it
  // is free to exclude and a judge can reasonably ask about it.
  if (sig.hasHighS()) {
    return fail("malleable_signature", "s > n/2");
  }

  let recovered: string;
  try {
    recovered = addressFromPublicKey(sig.recoverPublicKey(digestFor(scheme, message)).toRawBytes(false));
  } catch (error) {
    return fail("signature_invalid", error instanceof Error ? error.message : String(error));
  }

  if (recovered !== pinned) {
    return fail("signer_mismatch", `recovered 0x${recovered}, pinned 0x${pinned}`);
  }
  return { verified: true, scheme, signer: `0x${recovered}` };
}

function verifyEd25519(signature: Uint8Array, message: Uint8Array, pinned: string): AttestResult {
  if (signature.length !== 64) {
    return fail("malformed_signature", `expected 64 bytes, got ${signature.length}`);
  }
  if (pinned.length !== 64) {
    return fail("malformed_signer", `expected a 32-byte public key, got ${pinned.length / 2} bytes`);
  }
  let ok: boolean;
  try {
    ok = ed25519.verify(signature, message, hexToBytes(pinned));
  } catch (error) {
    return fail("signature_invalid", error instanceof Error ? error.message : String(error));
  }
  return ok ? { verified: true, scheme: "ed25519", signer: `0x${pinned}` } : fail("signature_invalid");
}

/**
 * Verify an envelope against the pinned enclave key. **Never throws** — every
 * internal error becomes a typed failure, because an exception path is a path
 * where a caller's `catch` could end up publishing a verdict.
 *
 * There is deliberately no "verification unavailable, proceed anyway" branch
 * and no env flag that disables this. Such a flag would be the flag someone
 * sets during a live demo.
 *
 * @param input    the response envelope, untrusted and unvalidated
 * @param pinnedKey `OG_ENCLAVE_PUBKEY` — a 20-byte address (secp256k1) or a
 *                  32-byte public key (ed25519), hex, 0x optional
 */
export function verifyEnvelope(input: unknown, pinnedKey: string): AttestResult {
  try {
    if (typeof pinnedKey !== "string" || stripHex(pinnedKey).length === 0) {
      return fail("missing_signer", "no pinned enclave key (OG_ENCLAVE_PUBKEY)");
    }
    const pinned = stripHex(pinnedKey).toLowerCase();
    if (!/^[0-9a-f]+$/u.test(pinned) || pinned.length % 2 !== 0) {
      return fail("malformed_signer", "pinned key is not even-length hex");
    }

    const parsed = envelopeSchema.safeParse(input);
    if (!parsed.success) {
      return fail("malformed_envelope", parsed.error.issues.map((i) => i.message).join("; "));
    }
    const envelope = parsed.data;

    if (stripHex(envelope.signature).length === 0) {
      return fail("missing_signature");
    }

    // The response claims a signer other than the one we trust. Nothing it says
    // afterwards is interesting.
    if (envelope.signer !== undefined) {
      const claimed = stripHex(envelope.signer).toLowerCase();
      if (claimed.length > 0 && claimed !== pinned) {
        return fail("signer_mismatch", `envelope claims 0x${claimed}, pinned 0x${pinned}`);
      }
    }

    let message: Uint8Array;
    if (envelope.encoding === "utf8") {
      // The caller asserts these ARE the signed bytes. Refuse to stringify
      // something that is not already text: `String(obj)` would happily produce
      // "[object Object]" and verify nothing.
      if (typeof envelope.payload !== "string") {
        return fail("payload_not_text", `encoding "utf8" needs a string payload, got ${typeof envelope.payload}`);
      }
      message = new TextEncoder().encode(envelope.payload);
    } else {
      try {
        message = canonicalBytes(envelope.payload);
      } catch (error) {
        if (error instanceof NotCanonicalError) return fail("not_canonical", error.message);
        throw error;
      }
    }

    let signature: Uint8Array;
    try {
      signature = hexToBytes(envelope.signature);
    } catch (error) {
      return fail("malformed_signature", error instanceof Error ? error.message : String(error));
    }

    switch (envelope.scheme) {
      case "secp256k1-eth":
      case "secp256k1-raw":
        if (pinned.length !== 40) {
          return fail("malformed_signer", `expected a 20-byte address, got ${pinned.length / 2} bytes`);
        }
        return verifySecp256k1(envelope.scheme, signature, message, pinned);
      case "ed25519":
        return verifyEd25519(signature, message, pinned);
      default:
        return fail("unsupported_scheme", String(envelope.scheme));
    }
  } catch (error) {
    // Belt and braces: the contract is "never throws", and the contract is what
    // the fail-closed guarantee rests on.
    return fail("signature_invalid", error instanceof Error ? error.message : String(error));
  }
}

/**
 * The publication gate (RF-M7-004). Read this at every call site that is about
 * to write a verdict, so the invariant is one function rather than a habit.
 */
export function mayPublish(result: AttestResult): result is Extract<AttestResult, { verified: true }> {
  return result.verified === true;
}
