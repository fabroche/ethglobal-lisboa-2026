# M6 · `evaluator`

> The sealed referee. Call 0G with a pinned model at temperature 0, decrypt both positions **only
> inside the enclave**, and emit one enum verdict — never free text.

| Field | Value |
|-------|-------|
| **ID** | M6 |
| **Status** | 🟩 **built (S2.2, 25 Jul)** — verified against the live enclave, `npm run eval:live` GO |
| **Backlog** | S2.2 |
| **Sponsor** | 0G |
| **Depends on** | M2 (`seal` — produces the ciphertexts), S2.1 spec (`spec-02-evaluator.md`) |
| **Used by** | M7 (`attest` — verifies the verdict's attestation), M4 (writes the verdict) |

## 1. Purpose & scope
Run the compatibility judgement **inside the 0G TeeML enclave** (D5). The evaluator calls the 0G
OpenAI-compatible router with a **pinned model** (hash recorded) at **temperature 0**, passes both
sealed ciphertexts, and constrains the output to a **fixed enum** (D9). Inside the enclave the two
positions are decrypted for the first and only time. The output is the **richest verdict both sides
consented to**. **Out of scope:** attestation verification (M7), writing the verdict (M4).

## 2. Actors
Hedera reveal (M5, triggers the call) · our server (makes the router call) · the 0G enclave (decrypts,
runs the pinned model, signs the result) · the two sides (their opt-in consent decides gap disclosure).

## 3. Functional requirements (RF)
| ID | Requirement | Priority |
|----|-------------|:--------:|
| RF-M6-001 | Call the 0G router (`OG_ROUTER_URL`) with the **pinned model** (`OG_MODEL`) at **temperature 0** | Must |
| RF-M6-002 | Pass both sealed ciphertexts; decryption happens **only inside the enclave** | Must |
| RF-M6-003 | Constrain output to the enum: `workable` \| `not_workable` (+ opt-in `gap:single`\|`gap:multiple` — how many dimensions block, never which; D9 as amended) | Must |
| RF-M6-004 | Emit `gap:*` **only if both sides opted in**; otherwise the bare verdict | Must |
| RF-M6-005 | Record the model hash alongside the verdict for reproducibility | Must |
| RF-M6-006 | Validate the enclave response shape with Zod (D11); reject anything off-enum | Must |
| RF-M6-007 | Prepend the room's **use-case prompt hint** (`usecases[useCase].evaluatorHint`, D16 — shared source `src/session/usecases.ts`, M1) so the model knows which dimensions matter; hint names dimensions, never terms; output stays enum-only | Should |

## 4. Non-functional requirements (RNF)
| ID | Requirement | Metric / criterion |
|----|-------------|--------------------|
| RNF-M6-001 | **Leak control** | The enclave never emits free text; only the enum leaves the box (D9) |
| RNF-M6-002 | **Determinism caveat** | Temp 0 + pinned hash; the claim is "*this* model saw *these* committed inputs and returned *this* verdict," **not** that any run reproduces it |
| RNF-M6-003 | Model pinned + recorded | Exact `OG_MODEL` and its hash are fixed and logged with the verdict |

## 5. Data touched
Consumes the two **sealed payloads** (M2); produces the **verdict** consumed by M7/M4 (verdict entry:
enum verdict, model hash, attestation ref). See `00-overview/02-data-model.md`.

## 6. Architecture / layer fit
`src/evaluator/og.ts` — the router call and enum constraint. Triggered by M5 on reveal. Output feeds
M7 (`src/evaluator/attest.ts` boundary) before M4 writes it. See `transversal/integration-0g.md`.

## 7. Functionalities

### F-M6-1 · Sealed evaluation with constrained output
| Field | Value |
|-------|-------|
| **ID** | F-M6-1 · **Status** 🟧 |

**Sequence:**
```mermaid
sequenceDiagram
  participant S as scheduler (reveal)
  participant E as evaluator
  participant OG as 0G enclave
  S->>E: reveal fired
  E->>OG: POST router (pinned model, temp 0, both ciphertexts, enum schema)
  OG->>OG: decrypt both (once, in enclave memory)
  OG->>OG: judge compatibility -> enum
  OG-->>E: signed enum verdict + attestation
  Note right of OG: plaintext burns; only the enum leaves
```
**Rules / validations:** output must be in the enum; `gap:*` only with two-sided consent; Zod-validate.
**Acceptance criteria:**
- [ ] Given two positions, the evaluator returns exactly one enum value.
- [ ] Given only one side opted into gap disclosure, the verdict is the bare `workable`/`not_workable`.
- [ ] Any non-enum output is rejected as an error, not published.

## 8. Endpoints / Server Actions / Integrations / Jobs
| Type | Name | Input | Output | Auth | Notes |
|------|------|-------|--------|------|-------|
| Integration | `evaluate` | `{ ciphertextA, ciphertextB, useCase, consent }` | `{ verdict, modelHash, attestation }` | `OG_KEY` | pinned model, temp 0, enum schema, use-case hint (RF-M6-007) |

## 9. UI components (Definition of Done)
| Component | Story | RTL test | Status |
|-----------|:-----:|:--------:|--------|
| _(no direct UI — verdict rendered by M8)_ | — | — | 🟧 |

## 10. Module acceptance criteria
- [x] Output is always within the enum (RF-M6-003); free text is impossible to publish.
      Two belts: `response_format` at the router, `verdictSchema` (Zod) on the way out. `parseVerdict`
      deliberately **refuses to mine an enum value out of prose** — recovering "workable" from a
      sentence would make the guarantee true in the types and false in reality.
- [x] `gap:*` is emitted only under two-sided consent (RF-M6-004). Enforced twice: the gap vocabulary
      is **never offered** in the prompt without consent, and `applyConsent` degrades a gap to
      `not_workable` on the way out. A prompt is a request; this is a privacy boundary.
- [x] The exact served model is recorded with the verdict (RF-M6-005) — see §12 on `-0427`.
- [x] No reasoning content is returned (D-M6-1). Both switches set, and a non-empty
      `reasoning_content` is a **failure, not a verdict**, checked before the verdict is even read.

## 11. Module closure DoD
Built as four files: `verdict.ts` (the closed vocabulary + consent gate), `prompt.ts` (the only text
that crosses into the enclave), `evaluate.ts` (orchestration behind a `SealedModel` port),
`og-request.ts` (the request body — kept free of `server-only` so the privacy switches are
unit-testable), plus the `og-client.ts` adapter. **56 unit tests** against a fake model, and
`npm run eval:live` for the real enclave. No UI (verdict rendered by M8), so no story required.

## 12. Risks & open decisions

- ✅ **Structured enum output IS natively supported** — `response_format` is in the model's
  `supported_parameters`, so the router constrains the output (belt #1) and Zod re-validates (belt #2).
  No booth needed.

- ⚠️ **D-M6-2 · who decrypts, and where.** This module takes **plaintext** positions. The spec says
  decryption happens inside the enclave, and that is where it belongs — but the 0G router is a chat
  API, so we cannot hand it a private key and have it run our ECIES decryption, and whether a separate
  enclave *encryption* key even exists is still unanswered (`OG_ENCLAVE_SEAL_PUBKEY` is empty). So the
  caller owns that boundary and must ensure plaintext exists only where it is allowed to.
  **This is an honest seam, not a solved problem — do not let it read as solved in the demo.**

- 📌 **The served model carries a snapshot suffix the catalog does not advertise.** The catalog says
  `0gm-1.0-35b-a3b`; the provider serves **`0GM-1.0-35B-A3B-0427`**. Found only by calling it — exact
  equality rejected the very model we pinned. So `servesPinnedModel` matches on **prefix** (the pin
  guarantees the family) while `EvaluateResult.model` records the exact snapshot (RF-M6-005). The
  `-sia` sibling still fails the prefix, which matters: it has its own provider and therefore its own
  signing key.

- **The model can be wrong** — it is a judgement. Framing: Seam says whether it is *worth a
  conversation*, nobody signs on the output (see `transversal/security-and-privacy.md`). This includes
  the single-vs-multiple attribution: the semantics define the right answer (count of blocking internal
  dimensions), the model can still misjudge the count on entangled positions.

  Observed live, and encouraging: on "price and timing both block" it answered `gap:multiple`; on
  "price agreed, only timing blocks" it answered `gap:single`. The counting semantics are not just
  specified, they work.
