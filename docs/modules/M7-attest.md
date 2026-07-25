# M7 · `attest`

> **The Friday-night spike and the core claim.** Verify the TEE attestation signature *independently
> of the 0G SDK*. If it doesn't hold, the whole product collapses — and we need to know Friday night.

| Field | Value |
|-------|-------|
| **ID** | M7 |
| **Status** | 🟩 S0.3 offline GO · live check pending credentials |
| **Backlog** | S0.3 (spike script) · S2.3 (per-verdict gate) |
| **Sponsor** | 0G |
| **Depends on** | S0.2 (`spec-03-attest.md`) |
| **Used by** | M6 (its verdict is gated here), M4 (writes the verdict only if this passes) |

## 1. Purpose & scope
Verify that a verdict really came out of the sealed enclave, by checking the TEE **attestation
signature outside the 0G SDK** — not merely receiving it. Providers generate a signing key **inside**
the TEE; the CPU/GPU attestations include that key's public key; every result is signed with it.
We download the attestation + response signature and verify against `OG_ENCLAVE_PUBKEY` using
`verifyEnvelope`. **Fail closed (D10):** a bad or missing signature ⇒ **no verdict published**.
S0.3 is the standalone **spike** (`scripts/spike-attest.ts`) proving it's possible at all; S2.3 is the
module that runs on **every** verdict. **Out of scope:** producing the verdict (M6), writing it (M4).

## 2. Actors
Our server / spike script (verifies) · the 0G enclave (signs with the in-TEE key) · the 0G attestation
download endpoint.

## 3. Functional requirements (RF)
| ID | Requirement | Priority | Status |
|----|-------------|:--------:|:------:|
| RF-M7-001 | Download the attestation and the response signature for a verdict | Must | 🟡 needs the live 0G endpoint (S0.3 PART B) |
| RF-M7-002 | Verify the signature against `OG_ENCLAVE_PUBKEY` **outside** the 0G SDK (`verifyEnvelope`) | Must | 🟩 own implementation, `@noble` primitives only |
| RF-M7-003 | **Fail closed**: on invalid/missing signature, do **not** publish the verdict (D10) | Must | 🟩 discriminated union, never throws |
| RF-M7-004 | Gate M4's verdict write on a passing verification | Must | 🟩 `mayPublish()` — wire in at S2.3 |
| RF-M7-005 | Record the attestation reference alongside the published verdict | Should | 🟩 `attestationRef` on the envelope |
| RF-M7-006 | Canonical, deterministic payload → bytes serialization | Must | 🟩 `canonical.ts` (spec-03 §3) |

## 4. Non-functional requirements (RNF)
| ID | Requirement | Metric / criterion |
|----|-------------|--------------------|
| RNF-M7-001 | **Independent verification** | Verified without trusting an SDK "isValid" boolean; we check the signature ourselves |
| RNF-M7-002 | **Fail-closed invariant** | No code path publishes a verdict when verification fails or is absent |
| RNF-M7-003 | Precise claim | Documented exactly what the signature covers (does it cover the input? — 0G workshop question) |

## 5. Data touched
Produces the **attestationRef** stored on the **verdict entry** (M4). See `00-overview/02-data-model.md`.

## 6. Architecture / layer fit
`src/evaluator/attest.ts` sits between M6 (produces verdict + attestation) and M4 (writes verdict).
The spike lives at `scripts/spike-attest.ts`. See `transversal/integration-0g.md` and
`transversal/security-and-privacy.md`.

## 7. Functionalities

### F-M7-1 · Independent attestation gate (fail closed)
| Field | Value |
|-------|-------|
| **ID** | F-M7-1 · **Status** 🟧 |

**Flow / activity:**
```mermaid
flowchart TD
  A([verdict + attestation from M6]) --> B[download attestation + signature]
  B --> C[verifyEnvelope against enclave pubkey]
  C --> D{valid?}
  D -- Yes --> E[allow M4 to write verdict]
  D -- No --> F[/publish nothing — fail closed/]
```
**Acceptance criteria:**
- [x] Given a valid attestation, the verdict is written. *(verifier side proven; the write is S2.3)*
- [x] Given a tampered byte, the signature fails and **no** verdict is written (demo Act 4).
- [x] Verification does not rely on the SDK's own validity flag (RNF-M7-001) — no 0G import exists
      anywhere in `attest.ts`.

## 8. Endpoints / Server Actions / Integrations / Jobs
| Type | Name | Input | Output | Auth | Notes |
|------|------|-------|--------|------|-------|
| Lib | `verifyEnvelope(envelope, enclavePubkey)` | verdict envelope | `true` \| `false` | none | package `@foundryprotocol/0gkit-attestation` (confirm at booth) |
| Script | `spike-attest.ts` | one sealed call | pass/fail | `OG_KEY` | Friday-night gamble |

## 9. UI components (Definition of Done)
| Component | Story | RTL test | Status |
|-----------|:-----:|:--------:|--------|
| _(no UI — the demo tampers a byte via the script)_ | — | — | 🟧 |

## 10. Module acceptance criteria
- [ ] The spike verifies a **real sealed call's** signature (S0.3 PART B) — ⛔ blocked on `OG_KEY`.
- [x] The spike verifies a **synthetic** enclave signature and rejects every forgery (S0.3 PART A).
- [ ] Every verdict is gated on independent verification (S2.3, RNF-M7-002) — `mayPublish()` exists,
      not yet wired to the write path.
- [x] Tampering one byte ⇒ no verdict (fail closed).

## 11. Module closure DoD
_See `_templates/module.md` §11._ Plus: a fail-closed test (tampered envelope ⇒ no write).

## 12. Risks & open decisions

### Resolved by S0.3 (offline)
- **D-M7-1 · we implement `verifyEnvelope` ourselves.** `@foundryprotocol/0gkit-attestation` is not
  resolvable, and adopting a vendor verifier would defeat RNF-M7-001 anyway. Built on `@noble/curves`
  + `@noble/hashes` (general-purpose, already present transitively). **No 0G code in the trust path.**
- **The verification math is proven.** `npm run spike` PART A passes for all three schemes: genuine
  signature verifies; tampered payload, tampered signature and wrong pinned key are all rejected.
  40 unit tests. **The design half of the gamble is won.**
- **Scope stated honestly:** we verify the last link (response signature → enclave key) and *pin* the
  enclave key. No TDX quote parsing / cert-chain walk to an Intel root — see spec-03 §5 for the exact
  sentence to use in the Q&A. Overstating this is the way to lose the room.

### Still open (need the booth / credentials)
- **RF-M7-001 is unproven.** PART B has never run — no `OG_KEY`. The wire format (where the signature
  lives, what bytes it covers) is discovered by the script, not assumed.
- **Does the signature cover the INPUT?** If not, "this model saw *these* inputs" is not supported by
  the attestation and the pitch needs rewording (fallback in spec-03 §8.1). Highest-stakes question.
- **Is `OG_ENCLAVE_PUBKEY` stable across requests?** If it is per-session, it cannot be a static env
  var and spec-03 §5 needs rework. **Most likely to cost hours — ask first.**
- **Integrator request:** promote `@noble/curves` + `@noble/hashes` from transitive to direct
  `dependencies` (they are in our trust path). `package.json` is integrator-only.
