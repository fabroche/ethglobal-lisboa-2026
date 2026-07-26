# spec-01 · session

Status: 🟧 draft · backlog **S1.1 / S1.2** · sponsor **Hedera**.

> Spec committed **before** the code (spec-driven-workflow rule). Implemented by module **M1 · session**
> and **M4 · registry** (write path).

## Goal
Open a negotiation room: publish the **expiry** to the HCS topic **before anyone writes anything**,
issue a join link/QR, and accept exactly **two commitments** (one per side).

## Inputs / outputs
| | Shape |
|---|---|
| **Input (create)** | `{ deadline: ISO8601, useCase: "property" \| "job" \| "otc", about?: string /* context anchor, ≤200, public-class */, sideLabels?: { a: string, b: string }, gapOptIn?: boolean }` |
| **Output (create)** | `{ roomId, topicId, expirySeq, joinUrl, qr }` |
| **Input (commit)** | `{ roomId, side: "a" \| "b", commitment: string /* sha256(ciphertext) */, nullifierRef, gapOptIn: boolean /* this side's consent, D9 */ }` |
| **Output (commit)** | `{ committedSeq }` |

## Message shapes (HCS topic, versioned)
```json
// expiry (published first, before any write)
{ "v": 1, "type": "expiry", "roomId": "…", "useCase": "property", "deadline": "2026-07-26T09:00:00Z" }

// commitment (one per side; gapOptIn = this side's consent to gap disclosure, D9)
{ "v": 1, "type": "commitment", "roomId": "…", "side": "a",
  "commitment": "sha256-hex-of-ciphertext", "nullifierRef": "…", "gapOptIn": false }
```
Every message carries `v` from message 1 (D4; backlog S2.6). Consensus timestamp is assigned by Hedera,
**not** placed inside the committed bytes (D12).

`useCase` selects a **guidance preset** (D16) from `src/session/usecases.ts`: default `sideLabels`,
write-screen placeholder + checklist (M8) and the evaluator prompt hint (M6). It is public metadata —
it names the deal *type*, never the terms. `sideLabels` defaults from the preset, overridable.

## Acceptance criteria
- [ ] The **expiry** message is on the topic **before** any commitment is accepted.
- [ ] The expiry message carries the room's `useCase`; Zod rejects values outside the preset enum.
- [ ] At most **two** commitments per room — **one per side**; a second from the same side is rejected.
- [ ] The join link/QR resolves to the write+seal screen for the correct side.
- [ ] Every accepted commitment is a well-formed, Zod-validated, versioned message.

## Non-goals
- No evaluation and no verdict here (that is spec-02).
- No attestation verification here (that is spec-03).
- No plaintext ever handled server-side — the client seals (M2).
