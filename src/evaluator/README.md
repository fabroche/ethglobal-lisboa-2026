# `evaluator` — sealed evaluation + attestation

Backlog **S2.2 / S2.3 / S0.3** · lean owner: `frank` (0G) · spec: `docs/modules/M6-evaluator.md`, `docs/modules/M7-attest.md`

Files:
- `og.ts` — call the 0G sealed model (OpenAI-compatible router, `OG_ROUTER_URL`), **pinned model, temp 0,
  constrained enum output only** (`workable` / `not_workable` / opt-in `gap:*`). Never free text.
- `attest.ts` — verify the TEE attestation signature **independently** (`verifyEnvelope`), **fail closed**:
  a bad/absent signature ⇒ no verdict published. This is the **Friday-night spike** (`scripts/spike-attest.ts`).
