# M2 · `seal` (client)

> **One of the two hard parts.** Encrypt a plain-language position in the browser to the enclave
> key, and produce a commitment the verifier can recompute. If the commitment doesn't match, the
> whole attestation claim collapses.

| Field | Value |
|-------|-------|
| **ID** | M2 |
| **Status** | 🟧 draft |
| **Backlog** | S1.4 |
| **Sponsor** | 0G |
| **Depends on** | S0.3 spike (`attest`, M7) — confirms sealing round-trips through the enclave |
| **Used by** | M4 (`registry.write` commits `sha256(ciphertext)`), M6 (`evaluator` decrypts in-enclave), M7 (`attest` recomputes the commitment), M8 (`write+seal` screen) |

## 1. Purpose & scope
In the **browser**, hybrid-encrypt the user's plaintext position to the enclave public key and
produce a deterministic **commitment** = `sha256(ciphertext)`. The server never holds a decryptable
copy (D5). **Out of scope:** writing the commitment to HCS (M4), decrypting (only inside 0G, M6),
verifying (M7).

## 2. Actors
Side A / Side B (write a position) · the client browser (WebCrypto) · the 0G enclave (holds the
private half of `OG_ENCLAVE_PUBKEY`, decrypts once inside the TEE).

## 3. Functional requirements (RF)
| ID | Requirement | Priority |
|----|-------------|:--------:|
| RF-M2-001 | Encrypt the plaintext position **in-browser** using hybrid encryption to `OG_ENCLAVE_PUBKEY` | Must |
| RF-M2-002 | Wrap an ephemeral AES-GCM content key to the enclave public key; AES-GCM the plaintext | Must |
| RF-M2-003 | Serialise the sealed payload **canonically** (sorted keys, fixed encodings) | Must |
| RF-M2-004 | Produce the commitment `sha256(ciphertext)` with **no clock timestamp inside the committed bytes** (D12) | Must |
| RF-M2-005 | Never transmit plaintext (or the content key) to the server | Must |

## 4. Non-functional requirements (RNF)
| ID | Requirement | Metric / criterion |
|----|-------------|--------------------|
| RNF-M2-001 | **Determinism** | Same plaintext + same content key ⇒ byte-identical ciphertext ⇒ identical commitment; the verifier (M7) recomputes the same hash |
| RNF-M2-002 | Browser-only plaintext | Plaintext exists only in the tab's memory; nothing decryptable leaves the browser |
| RNF-M2-003 | Reproducible serialisation | No `Date.now()`, no map-iteration-order dependence, numbers as fixed strings |

## 5. Data touched (client payload)
Produces the **sealed payload** and the **commitment** consumed by M4/M6/M7. See `00-overview/02-data-model.md`.
```mermaid
classDiagram
  class SealedPayload {
    +int v
    +bytes wrappedKey  "AES key wrapped to enclave pubkey"
    +bytes iv
    +bytes ciphertext  "AES-GCM(plaintext)"
  }
  class Commitment {
    +int v
    +string side "A|B"
    +string sha256 "hash of ciphertext bytes"
  }
```

## 6. Architecture / layer fit
Runs entirely client-side in the `web` write+seal screen (M8): `src/seal/` (WebCrypto helpers) →
returns `{ sealedPayload, commitment }`. The Server Action only ever receives the **ciphertext +
commitment**, never plaintext.

## 7. Functionalities

### F-M2-1 · Seal a position and commit the ciphertext
| Field | Value |
|-------|-------|
| **ID** | F-M2-1 · **Status** 🟧 |

**Flow / activity:**
```mermaid
flowchart TD
  A([plaintext position]) --> B[generate ephemeral AES-GCM key]
  B --> C[AES-GCM encrypt plaintext -> ciphertext]
  B --> D[wrap AES key to enclave pubkey]
  C --> E[canonical serialise sealed payload]
  C --> F[sha256 ciphertext -> commitment]
  E --> G[/send ciphertext + commitment to server/]
  F --> G
  A -. never leaves browser .-> A
```

**Rules / validations:** commitment hashes the **ciphertext bytes only**; no timestamp in committed
bytes (D12); Zod-validate the payload shape before returning.
**Acceptance criteria:**
- [ ] Given the same plaintext and content key, the commitment is byte-identical across runs.
- [ ] Plaintext never appears in any network request (verify in devtools during E2E).
- [ ] M7 recomputes the identical `sha256` from the committed ciphertext.

## 8. Endpoints / Server Actions / Integrations / Jobs
| Type | Name | Input | Output | Auth | Notes |
|------|------|-------|--------|------|-------|
| Client fn | `seal(position, enclavePubkey)` | plaintext + pubkey | `{ sealedPayload, commitment }` | n/a (browser) | WebCrypto; no server call |
| Action | `submitCommitment` | `{ roomId, side, ciphertext, sha256 }` | ack | World-gated (M3) | forwards to M4 |

## 9. UI components (Definition of Done)
| Component | Story | RTL test | Status |
|-----------|:-----:|:--------:|--------|
| `seal-position-form` | ⬜ | ⬜ | 🟧 |

## 10. Module acceptance criteria
- [ ] The commitment recomputed by M7 equals the one written to HCS by M4.
- [ ] No plaintext or content key is ever sent to the server (D5).
- [ ] Sealing is deterministic (RNF-M2-001).

## 11. Module closure DoD
_See `_templates/module.md` §11._ Priority tests: determinism of `seal`, canonical serialisation, commitment recomputation parity with M7.

## 12. Risks & open decisions
- Exact hybrid scheme / curve must match what the 0G enclave decrypts — **confirm at the 0G booth**.
- Canonical serialisation is the classic footgun (key order, number formatting) — cover with fixtures.
