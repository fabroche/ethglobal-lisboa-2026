# spec-04 · seal (client)

Status: 🟩 ready · backlog **S1.4** · sponsor **0G** · module **M2**.

> Spec committed **before** the code (spec-driven-workflow rule). Implemented by `src/seal/`.
> **One of the two hard parts** (`CLAUDE.md`). Encrypt a plain-language position in the browser to the
> enclave key, and produce a commitment the verifier can recompute.

## Goal

In the **browser**, hybrid-encrypt the user's position to the enclave's public key and produce
`commitment = sha256(ciphertext)`. The server never holds a decryptable copy (D5). Plaintext exists
only in the tab's memory.

---

## 1. Decision D-M2-1 — "deterministic" must NOT mean "deterministic across runs"

`M2-seal.md` RNF-M2-001 reads: *"Same plaintext + same content key ⇒ byte-identical ciphertext ⇒
identical commitment."* Implemented literally — a fixed content key, or a key derived from the
plaintext — **this is a confidentiality bug, not a feature.**

Deterministic encryption leaks **equality of plaintexts**. Both sides seal to the same enclave key
and both ciphertexts are published as commitments on a public HCS topic. If sealing were
deterministic across runs, then:

- identical positions from A and B ⇒ **identical commitments, visible to anyone reading the topic**.
  The operator, and both parties, learn "you two wrote exactly the same thing" — which is precisely
  the kind of cross-side inference §a of the threat model promises cannot happen;
- and it re-opens the probing attack from a new angle: an attacker who guesses a candidate position
  can seal it themselves and **compare commitments** to confirm the guess. Offline, unlimited,
  unaffected by the one-seat control (which limits *submissions*, not *guesses*).

**Decision.** Sealing is **randomized**: a fresh ephemeral keypair per seal, so two seals of the same
text produce different ciphertext and different commitments. Determinism is scoped to what the
requirement actually needs it for:

| What must be deterministic | Why | How |
|---|---|---|
| `seal(plaintext, pubkey, **ephemeralSecret**)` | testable, auditable, reproducible from fixtures | pure function of its three inputs |
| `commitment` from committed ciphertext | M7/M4 must recompute the same hash (RF-M2-004) | `sha256` over the ciphertext bytes — trivially reproducible |
| canonical serialization of the payload | two machines must agree on the bytes | `canonical.ts` (spec-03 §3) |

Nothing requires *the same plaintext* to seal to *the same bytes twice*, and requiring it would break
the product. RNF-M2-001 should be read as **"reproducible given the ephemeral secret"**; M2-seal.md
§4 is amended accordingly.

**Randomness is therefore load-bearing.** The ephemeral secret comes from `crypto.getRandomValues`
and is never reused, logged, or sent. A repeat means a repeated commitment, which is the leak above.

## 2. Decision D-M2-2 — the encryption key is NOT the attestation key

`OG_ENCLAVE_PUBKEY` (spec-03) is what M7 verifies signatures against — for secp256k1 it is a 20-byte
**address**, from which no one can encrypt. Encryption needs a full public key, and the enclave's
signing key and decryption key may well be different keys entirely.

**Decision.** `seal()` takes the recipient key **as an argument** (as `M2-seal.md` §8 already
specifies) rather than reading env. No `env.ts` change is needed now — that file is integrator-only.
When S3.2 wires the UI, it will need a **new** variable, `OG_ENCLAVE_SEAL_PUBKEY`; requested from the
integrator here rather than edited in parallel.

**Booth question:** which key does the enclave decrypt with, and what curve/format? Until answered,
the suite is tagged in the payload (§3) so a change is a data change, not a rewrite — the same
approach that let the S0.3 spike answer its own scheme question empirically.

## 3. Cipher suites

Tagged explicitly, never inferred. Both are ECIES: ephemeral ECDH → HKDF-SHA256 → AES-256-GCM.

| Suite tag | KEM | Notes |
|---|---|---|
| `x25519-hkdf-sha256-aes256gcm` | X25519 | **Default.** Modern, HPKE-shaped, no point-validation footguns. |
| `secp256k1-hkdf-sha256-aes256gcm` | secp256k1 ECDH | Most likely match for an Ethereum-flavoured 0G enclave key. |

Both are implemented with `@noble/curves` + `@noble/hashes` (already present) and **WebCrypto** for
AES-GCM — isomorphic, so the same code runs in the browser and under Vitest in Node.

Derivation, per seal:

```
shared   = ECDH(ephemeralSecret, enclavePubKey)
prk      = HKDF-Extract(SHA-256, salt = "", ikm = shared)
key‖iv   = HKDF-Expand(prk, info = "seam/seal/v1|" ‖ suite ‖ "|" ‖ epk, len = 32 + 12)
ct‖tag   = AES-256-GCM(key, iv, plaintext, aad = canonical(header))
```

- **The ephemeral public key is bound into the HKDF `info`**, so a substituted `epk` derives a
  different key and decryption fails rather than silently succeeding on attacker-chosen material.
- **The IV is derived, not random and not zero.** The AES key is unique per seal (fresh ephemeral
  ECDH), so nonce reuse is impossible by construction, and a derived IV removes one more field an
  attacker could grind on. It is not transmitted — the enclave re-derives it.
- **AAD binds the header** (`v`, `suite`, `epk`) so the suite tag cannot be downgraded without the
  tag check failing.

## 4. The sealed payload

```ts
type SealedPayload = {
  v: 1;
  suite: SealSuite;
  epk: string;         // ephemeral public key, hex
  ciphertext: string;  // AES-GCM output INCLUDING the 16-byte tag, hex
};
```

No `iv` field (derived). No timestamp — **rule 7 of spec-03 §3**: nothing ambient may enter bytes that
get committed.

## 5. The commitment — interop contract

```
commitment = sha256(ciphertext bytes)   ->  64 LOWERCASE hex chars
```

This must satisfy `commitmentMessageSchema.commitment` in `src/session/messages.ts` (Dylan, M1/M4),
which is `z.string()` constrained to 64 lowercase hex. **Hash the raw ciphertext BYTES, not the hex
string** — hashing the hex would still be self-consistent but would silently disagree with any
independent verifier that does the obvious thing.

**Known limitation, recorded deliberately.** RF-M2-004 defines the commitment over the ciphertext
only, so it does **not** bind `epk` or `suite`. An operator who substituted those would cause
decryption to fail inside the enclave — a **denial of service, not a confidentiality break** (AEAD
catches it; the wrong key never yields plaintext). Committing over the whole canonical payload would
close even that, but it would change the contract M4 already writes and M7 already recomputes.
**Not changing it unilaterally** — raised for the integrator as an open decision.

## 6. API

```ts
function seal(
  plaintext: string,
  enclavePubKey: string,
  opts?: { suite?: SealSuite; ephemeralSecret?: Uint8Array },  // secret: TESTS ONLY
): Promise<{ sealedPayload: SealedPayload; commitment: string }>;
```

- `ephemeralSecret` is injectable **only** so fixtures are reproducible (§1). Production never passes
  it; the default path calls `crypto.getRandomValues`.
- **Never returns the plaintext, the shared secret, the derived key or the ephemeral private key.**
- Rejects empty plaintext and a malformed recipient key. Zod-validates its own output before
  returning, so a malformed payload is caught here rather than at the HCS write.

## 7. Acceptance criteria

- [ ] Round-trip: `unseal(seal(text)) === text` with the matching private key (test-only `unseal`,
      standing in for the enclave).
- [ ] **Two seals of the same plaintext differ** — different ciphertext AND different commitment (§1).
      This is the test that would fail if someone "fixed" determinism the literal way.
- [ ] Given a fixed `ephemeralSecret`, output is byte-identical across runs.
- [ ] `commitment` is 64 lowercase hex and equals `sha256` of the ciphertext bytes, recomputable by a
      third party from the payload alone.
- [ ] Tampering one byte of the ciphertext ⇒ decryption **fails** (AEAD), and the commitment no
      longer matches.
- [ ] A substituted `epk` ⇒ decryption fails (bound via HKDF info).
- [ ] Plaintext never appears in any network request (Playwright E2E, S3.4).
- [ ] Works in both suites.

## 8. Open questions for the 0G booth

1. **Which key does the enclave decrypt with, and what curve/format?** (D-M2-2 — blocks the live path.)
2. Is the decryption key **the same** as the attestation signing key, or separate?
3. Does the enclave expect a particular envelope format (HPKE? a 0G-specific wrapper?), or is the
   sealed payload ours to define as long as it can decrypt it?

## 9. Non-goals

- **No decryption in production code.** `unseal` exists in the test kit only; the enclave decrypts.
- No key management, rotation or persistence — the ephemeral key dies with the function call.
- No writing to HCS (M4), no UI (M8, S3.2).
