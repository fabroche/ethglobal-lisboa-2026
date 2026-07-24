# spec-03 · attest

Status: 🟧 draft · backlog **S0.2 / S0.3** · sponsor **0G** · **THE FRIDAY-NIGHT SPIKE**.

> Spec committed **before** the code (spec-driven-workflow rule). Implemented by `scripts/spike-attest.ts`
> (Friday night) and module **M7 · attest**. **This is the whole bet:** if the attestation cannot be
> verified independently, the core claim collapses and we need to know Friday, not Sunday.

## Goal
Verify the TEE attestation signature **outside** the 0G SDK, and **fail closed**: a bad or missing
signature ⇒ **no verdict is published** (D10).

## Inputs / outputs
| | Shape |
|---|---|
| **Input** | `{ envelope /* attestation */, responseSignature, enclavePubKey /* OG_ENCLAVE_PUBKEY */ }` |
| **Output** | `{ verified: boolean }` — the publish of the verdict is **gated** on `verified === true` |

## Function signature (sketch)
```ts
// verifyEnvelope from @foundryprotocol/0gkit-attestation
//   (package/endpoint referenced in seam-updated — CONFIRM at the 0G booth)
import { verifyEnvelope } from "@foundryprotocol/0gkit-attestation";

async function attest(envelope: Envelope, sig: string, pubKey: string): Promise<boolean> {
  // download the attestation + response signature from the 0G provider endpoint,
  // then verify the signature against the in-enclave signing key's public key,
  // WITHOUT going through the 0G SDK's happy path.
  return verifyEnvelope({ envelope, signature: sig, publicKey: pubKey });
}
```

## Acceptance criteria
- [ ] A genuine response → `verified: true`.
- [ ] **One tampered byte** in the envelope or signature → `verified: false` → **no verdict published**.
- [ ] Verification does **not** rely on the 0G SDK's own trust path — it is independent.

## What the attestation actually proves (be precise in the Q&A)
It proves **this model saw these committed inputs and returned this verdict** — signed by a key generated
inside the TEE, whose public key is included in the CPU/GPU attestations. It does **not** prove that any
future run reproduces the same verdict. Overstating this is what loses the Q&A.

## Non-goals
- No evaluation here (that is spec-02). This module only *gates* publication.
- No user keys involved — only the enclave's in-TEE signing key and its public key (D8).
