# spec-03 · attest

Status: 🟩 ready · backlog **S0.2 / S0.3** · sponsor **0G** · **THE FRIDAY-NIGHT SPIKE**.

> Spec committed **before** the code (spec-driven-workflow rule). Implemented by `src/attest/`
> (module **M7**) and exercised by `scripts/spike-attest.ts`. **This is the whole bet:** if the
> attestation cannot be verified independently, the core claim collapses and we need to know Friday,
> not Sunday.

## Goal

Verify the TEE attestation signature **outside** the 0G SDK, and **fail closed**: a bad, missing or
unverifiable signature ⇒ **no verdict is published** (D10).

"Outside the SDK" is the load-bearing phrase. Receiving `{ valid: true }` from a vendor library
proves nothing — the library is the thing we are trying not to trust. We re-derive the signer from
the signature ourselves, with general-purpose crypto, and compare it to a key we pinned
out-of-band.

---

## 1. Decision D-M7-1 — we implement `verifyEnvelope` ourselves

The seed docs referenced `verifyEnvelope` from **`@foundryprotocol/0gkit-attestation`**. That package
is **not resolvable** (not in `node_modules`, not confirmed on npm), and — more importantly — taking a
vendor's verifier would defeat the requirement it is meant to satisfy (RNF-M7-001).

**Decision:** `verifyEnvelope` is **our own function**, in `src/attest/verify-envelope.ts`, built on
general-purpose primitives only:

| Need | Primitive | Source |
|---|---|---|
| keccak256 digest | `keccak_256` | `@noble/hashes` |
| sha256 digest | `sha256` | `@noble/hashes` |
| secp256k1 recover + verify | `secp256k1` | `@noble/curves` |
| ed25519 verify | `ed25519` | `@noble/curves` |

Both are already present (transitive via `@hashgraph/sdk`) — **no `package.json` change needed**, which
matters because that file is integrator-only (`branching-strategy.md` §3.4). See §8 for the follow-up.

**Zero 0G code is in the trust path.** The 0G SDK (if we adopt one for the *call*) may deliver the
bytes; it never gets to tell us whether they are good.

## 2. The envelope

The unit of verification. `payload` is the exact object the enclave committed to; everything else is
evidence about it.

```ts
type Envelope = {
  payload: unknown;        // what the enclave signed over (for Seam: the verdict record)
  signature: string;       // hex, 0x-prefixed. 65 bytes (r||s||v) for secp256k1, 64 for ed25519
  signer: string;          // hex. 20-byte address (secp256k1) or 32-byte pubkey (ed25519)
  scheme: SignatureScheme; // see §4 — explicit, never inferred from length
  model?: string;          // pinned model id, echoed back
  attestationRef?: string; // URL/id of the raw CPU+GPU quote (stored with the verdict, RF-M7-005)
};
```

`signer` is **evidence, not authority**: it is what the response claims. Authority comes only from
`OG_ENCLAVE_PUBKEY` (§5).

## 3. Canonical serialization (RF-M7-006)

A signature is over bytes, so `payload` → bytes must be **one** function, agreed by both signer and
verifier, and stable across runs and machines. This is one of the two hard parts named in `CLAUDE.md`.

Rules — `canonicalize(payload)`:

1. **Object keys sorted** lexicographically by UTF-16 code unit, recursively.
2. **No insignificant whitespace** — the compact JSON form.
3. **UTF-8** encoding, **NFC**-normalized strings.
4. **Arrays keep their order** (order is meaning).
5. **`undefined` and function values dropped**; `null` is preserved (it is a value).
6. **No floats.** Integers only, rejected if outside `Number.MAX_SAFE_INTEGER`. Float formatting is
   not portable and we never need one.
7. **No timestamp, nonce, or any ambient value inside the signed bytes.** Anything that varies per
   run makes the commitment unverifiable later. Same rule as the `seal` commitment.

This is JCS (RFC 8785) in spirit, restricted to the subset we actually use. It is written by hand —
it must be auditable in one screen and have no dependency.

**Test obligation:** the same logical payload, built with keys inserted in a different order, MUST
produce byte-identical output. This is the determinism unit test.

## 4. Signature schemes

Explicit, never guessed from byte length.

| Scheme | Digest | Verification | Compare against |
|---|---|---|---|
| `secp256k1-eth` | `keccak256(canonical)`, wrapped in the EIP-191 `\x19Ethereum Signed Message:\n<len>` prefix | **recover** the public key from `(r,s,v)`, derive the address as the last 20 bytes of `keccak256(pubkey[1..])` | `signer` address, case-insensitive |
| `secp256k1-raw` | `keccak256(canonical)`, no prefix | same recovery, no EIP-191 wrapper | same |
| `ed25519` | raw canonical bytes (ed25519 hashes internally) | `ed25519.verify(sig, msg, pubkey)` | 32-byte public key |

**`secp256k1-eth` is the default.** 0G Compute providers sign Ethereum-style, and recovery (rather
than plain verify) is exactly why we cannot lean on Node's built-in `crypto` — it has secp256k1 keys
but no public-key recovery. `secp256k1-raw` exists because whether the provider applies the EIP-191
prefix is **unconfirmed** (§8); the spike tries both and reports which one matched, so one booth
question gets answered by running the script rather than by asking.

Malleability: **reject high-`s` signatures** (`s > n/2`). A malleable signature would let a third
party produce a second valid encoding of the same verdict — irrelevant to safety here but free to
exclude, and its absence is a question a judge can reasonably ask.

## 5. The trust anchor, stated honestly

Verification answers: *was this envelope signed by the key at `OG_ENCLAVE_PUBKEY`?*

The full chain a production system would walk is:

```
Intel/NVIDIA root cert
  └─> TDX quote / GPU attestation report   [signed by hardware]
        └─> in-enclave signing key pubkey  [embedded in the quote]
              └─> response signature       [this is where we verify]
```

**We verify the last link and pin the third.** `OG_ENCLAVE_PUBKEY` is read from the provider's
attestation endpoint **once, out-of-band**, recorded in `.env.local`, and treated as the anchor.
Parsing a raw TDX quote and validating its certificate chain to an Intel root is **out of scope for
the hackathon** — it is days of work and not what the track is asking for.

**Say this exactly this way in the Q&A.** The claim "we verify the TEE attestation end to end from the
Intel root" is false and someone in that room will know it. The claim "we verify the enclave's
signature independently of the vendor SDK, against a key we pinned from the attestation" is true,
demonstrable in 20 seconds by flipping a byte, and still the strongest claim in the room. Overstating
is what loses the Q&A (`integration-0g.md` §4).

`attestationRef` is stored next to the verdict so a third party can pull the raw quote and walk the
upper links themselves. We do not ask anyone to take our word for the part we did not do.

## 6. Result type — fail closed by construction (RF-M7-003)

The verifier does **not** return a bare boolean. A boolean invites `if (!res)` to be forgotten, and
`catch {}` to silently mean "fine".

```ts
type AttestResult =
  | { verified: true;  scheme: SignatureScheme; signer: string }
  | { verified: false; reason: AttestFailure; detail?: string };

type AttestFailure =
  | "missing_signature" | "missing_signer"  | "malformed_signature"
  | "malformed_signer"  | "unsupported_scheme"
  | "signer_mismatch"        // recovered a key, but not the pinned one
  | "signature_invalid"      // recovery/verification failed outright
  | "malleable_signature"    // high-s
  | "not_canonical";         // payload not serializable under §3

function verifyEnvelope(envelope: unknown, pinnedKey: string): AttestResult;
```

Contract, binding on every caller:

- **Never throws.** Any internal error becomes `{ verified: false, reason }`. An exception path is a
  path where a caller's `catch` could publish a verdict.
- **Unknown input.** Takes `unknown`, Zod-validates the envelope shape itself (D11). A malformed
  response is a failure, not a crash.
- **The only true is the narrow one.** `verified: true` requires: shape valid → canonical →
  scheme supported → signature well-formed → low-s → recovered signer **equals the pinned key**.
- **Publication is gated on `result.verified === true`** and nothing else. Not on absence of an
  exception, not on truthiness of the object (`{verified:false}` is truthy — hence the discriminant).
- **No fallback.** There is no "verification unavailable, proceed anyway" branch, no env flag that
  disables it. If such a flag existed it would be the flag that is set during a live demo.

## 7. Acceptance criteria

**S0.2 (this spec)** — done when §2–§6 are stable enough to code against. ✅

**S0.3 (the spike)** — `npm run spike`:

- [ ] **Self-test (offline, no credentials).** Generate a keypair, sign a Seam-shaped verdict, verify
      it → `verified: true`. Proves our verifier is correct independently of 0G being reachable.
- [ ] **Tamper test.** Flip **one byte** of the payload → `verified: false`, `reason: "signer_mismatch"`.
      Flip one byte of the signature → `verified: false`. This is demo Act 4.
- [ ] **Wrong-key test.** Valid signature, different pinned key → `verified: false`,
      `reason: "signer_mismatch"`. Rules out "verifies anything that is well-formed".
- [ ] **Determinism test.** Two key orderings of one payload → identical canonical bytes.
- [ ] **Live test (needs `OG_KEY`).** One real sealed 0G call; verify the returned signature against
      `OG_ENCLAVE_PUBKEY`; report which scheme matched.
- [ ] Verification does **not** call any 0G SDK function (RNF-M7-001).
- [ ] Exit code is non-zero if any check fails — this is a go/no-go gate, it must be able to say no.

The offline checks gate the design; the live check gates the product. **They fail separately and are
reported separately**, so "0G is down at 23:00" is never confused with "our crypto is wrong".

## 8. Open questions for the 0G booth (Friday 14:30)

Ordered by how much damage a wrong assumption does.

1. **What exactly does the response signature cover?** Only the completion text, or the *request* too?
   If the input is not covered, the attestation does not prove "this model saw *these* inputs" — and
   that sentence is our pitch. Fallback if not covered: include a hash of the sealed inputs in the
   prompt so it is echoed into the signed completion.
2. **Is the EIP-191 prefix applied?** (`secp256k1-eth` vs `secp256k1-raw` — the spike answers this
   empirically, so confirmation is a bonus, not a blocker.)
3. **Where is the enclave signing pubkey served from,** and is it stable across requests or per
   session? Per-session means `OG_ENCLAVE_PUBKEY` cannot be a static env var and §5 needs rework —
   **this is the answer most likely to cost us hours**, ask it first.
4. **Constrained/enum output** at the router (schema support)? — leak control, D9.
5. The submission form asks for **contract addresses**; what is expected from a product with no
   contract? (Track in `00-overview/05-open-decisions.md`.)

**Follow-up for the integrator:** `@noble/curves` + `@noble/hashes` are currently *transitive*
dependencies (via `@hashgraph/sdk`). They are in our trust path, so they should be promoted to direct
`dependencies` in `package.json` — an integrator-only edit, requested here rather than done.

## 9. Non-goals

- **No evaluation here** (that is spec-02). This module only *gates* publication.
- **No user keys.** Only the enclave's in-TEE signing key and its public key (D8).
- **No TDX quote parsing / cert-chain walk** (§5) — scoped out, and said out loud rather than implied.
