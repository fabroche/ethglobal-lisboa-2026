# M6 · `evaluator`

> The sealed referee. Call 0G with a pinned model at temperature 0, decrypt both positions **only
> inside the enclave**, and emit one enum verdict — never free text.

| Field | Value |
|-------|-------|
| **ID** | M6 |
| **Status** | 🟧 draft |
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
| RF-M6-003 | Constrain output to the enum: `workable` \| `not_workable` (+ opt-in `gap:compensation\|timing\|scope`) | Must |
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
- [ ] Output is always within the enum (RF-M6-003); free text is impossible to publish.
- [ ] `gap:*` is emitted only under two-sided consent (RF-M6-004).
- [ ] The model hash is recorded with the verdict (RF-M6-005).

## 11. Module closure DoD
_See `_templates/module.md` §11._ Plus: consent/gap logic and enum-validation unit tests.

## 12. Risks & open decisions
- Is structured/enum output natively supported by the 0G router, or enforced by prompt + validation?
  **Confirm at the 0G booth** (14:30).
- The model can be wrong — it's a judgement. Framing: Seam says whether it's *worth a conversation*,
  nobody signs on the output (see `transversal/security-and-privacy.md`).
