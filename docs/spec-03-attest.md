# spec-03 · attest

Status: 🟩 ready · backlog **S0.2 / S0.3** · sponsor **0G** · **THE FRIDAY-NIGHT SPIKE**.

> Spec committed **before** the code (spec-driven-workflow rule). Implemented by
> `src/evaluator/attest.ts` + `src/evaluator/canonical.ts` (module **M7**, paths per `M7-attest.md` §6)
> and exercised by `scripts/spike-attest.ts`. **This is the whole bet:** if the
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

## 8. The wire format — ANSWERED (25 Jul, empirically)

None of these needed a booth in the end. Querying the API and reading the chain answered all of them,
which is the better outcome: every claim below is reproducible by `npm run spike`.

### 8.1 What does the signature cover? ✅ **INPUT AND OUTPUT**

The signed value is a raw string:

```
sha256(<request, normalised by the broker>) : sha256(<raw response bytes>)
```

- The **second** half is exactly `sha256` of the response bytes as received. We assert this.
- The **first** half **changes when the prompt changes** — verified with two calls differing only in
  their prompt. We cannot recompute it (the broker normalises the request before hashing), so state it
  as *"derived from the request"*, never *"sha256 of our bytes"*.

**Therefore "this model saw *these* inputs and returned this verdict" is supported.** The fallback of
hashing sealed inputs into the prompt is unnecessary and has been dropped.

### 8.2 Is the EIP-191 prefix applied? ✅ **YES** — `secp256k1-eth`

The SDK verifies with `ethers.hashMessage`, which *is* the `\x19Ethereum Signed Message:\n` framing,
and the broker reports `signing_algo: "ecdsa"`. Our `DEFAULT_SCHEME` was right.

### 8.3 Where does the signing key come from, and is it stable? ✅ **On-chain, and it can move**

It is `teeSignerAddress` from `getService(provider)` on the mainnet InferenceServing contract — **not**
the provider address, which is only a billing identity and which is what every API surface hands you.
It is stable across requests (so a static env var is fine, §5 stands), but it **changes if the enclave
is redeployed**, so the spike re-checks it on-chain rather than trusting the file.

### 8.4 Constrained/enum output? ✅ `response_format` is in `supported_parameters` (D9, belt #1)

### 8.5 A new one, learned the hard way: the payload is a RAW STRING

Canonical serialisation (§3) is correct for payloads *we* construct, and **wrong** for this one:
canonicalising a string wraps it in JSON quotes, so the bytes stop being what the enclave hashed. It
then fails as **`signer_mismatch`**, which is indistinguishable at a glance from a wrongly pinned key
and sends you looking in the wrong place. Hence `encoding: "canonical" | "utf8"` on the envelope,
defaulting to `canonical`, with a test asserting the real signature FAILS under `canonical`.

### 8.6 Still open

- **Is there a separate enclave ENCRYPTION key?** `seal` (M2) needs one; `teeSignerAddress` is a
  20-byte address and you cannot encrypt to an address. Not on the attestation critical path.
- The submission form asks for **contract addresses**; what is expected from a product with no
  contract? (Track in `00-overview/05-open-decisions.md`.)

**Follow-up for the integrator:** `@noble/curves` + `@noble/hashes` are currently *transitive*
dependencies (via `@hashgraph/sdk`). They are in our trust path, so they should be promoted to direct
`dependencies` in `package.json` — an integrator-only edit, requested here rather than done.

## 9. Non-goals

- **No evaluation here** (that is spec-02). This module only *gates* publication.
- **No user keys.** Only the enclave's in-TEE signing key and its public key (D8).
- **No TDX quote parsing / cert-chain walk** (§5) — scoped out, and said out loud rather than implied.
