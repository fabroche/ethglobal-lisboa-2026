# 04 · Conventions

Status: 🟧 draft · Last updated: 2026-07-24

Reused almost 1:1 from `home-os`, minus Supabase (D1). **English everywhere** (D2) — code, docs, commits,
UI; web3/crypto terms stay as-is (TEE, enclave, attestation, nullifier, HCS).

## Stack & language

- **TypeScript strict.** No `any`, no `as any`. `@/*` path alias to `src`.
- **React 19** — `ref` is a **normal prop** (no `forwardRef`).
- **Next.js 16** (App Router) with **Server Actions** (`'use server'`) validated with **Zod**.
- **Tailwind v4** — tokens in `globals.css @theme`; **never** a `tailwind.config.js`.
- **`cn()`** (`src/lib/utils.ts`) for conditional classes, always.
- **date-fns** (D14) for deadlines / consensus timestamps — no Moment.
- **Env only from `src/config/env.ts`** — Zod, fail-fast. Never read `process.env` elsewhere.

## Dependency layering (single direction)

```
web UI  →  Server Actions (Zod)  →  module libs (src/<module>/)  →  external SDK/service
```

- The **UI never imports an external SDK** (0G router, Hedera SDK, World) directly — it goes through a
  Server Action, which goes through a module lib.
- Business logic never lives in the transport layer.
- **Every external response is validated with Zod** at the boundary (D11): 0G output, Hedera SDK results,
  Mirror Node REST, World. Off-shape ⇒ a handled failure, never a silent pass.

## Hard guardrails (repeat — these are the identity of the project)

| # | Guardrail |
|---|-----------|
| G1 | **No Solidity, no smart contracts** (D3). Three native services + two SDKs only. |
| G2 | **No database** (D4). Storage is the HCS topic. No Postgres, no ORM, no server store of terms. |
| G3 | **No user private keys** (D8). We hold only our own Hedera testnet account key; users sign nothing. |
| G4 | **The enclave emits an enum only** (D9). Never free text — that is the leak control. |
| G5 | **Fail closed** (D10). No verdict is published unless the attestation verifies independently. |
| G6 | **Deterministic commitment** (D12). No clock timestamp in the committed bytes; verifier recomputes it. |
| G7 | **Sealed plaintext** (D5). Plaintext exists only inside the enclave, once, then is gone. |

## Naming

- Files/dirs: `kebab-case`. Module libs live in `src/<module>/` (`session`, `seal`, `worldid`,
  `registry`, `scheduler`, `evaluator`, `attest`, `web`).
- Message `type` values are lowercase literals: `expiry` · `commitment` · `verdict`.
- Verdict enum values exactly as in `02-data-model.md`.

## Git

- **Conventional Commits, in English** (`feat(session): …`, `fix(attest): …`, `docs: …`, `chore(backlog): claim S2.2`).
- **Commit every 30 minutes** from hour one, even when ugly — missing history can disqualify.
- **No squash** — the history is a submission artefact.
- **Spec before code** — the spec files (`../spec-01-session.md`, `../spec-02-evaluator.md`,
  `../spec-03-attest.md`) are committed **before** their implementation.
- Every AI-assisted file is logged in `../ai-usage.md`; commits carry `Co-Authored-By: Claude`.
- Branching per `../branching-strategy.md`.

## Security & privacy

The threat model is a first-class document: **`../transversal/security-and-privacy.md`**. Read it before
touching `seal`, `evaluator`, `attest`, or `registry`. In short: what leaks and what doesn't, why the
enclave + enum + one-seat-per-side together close the probing attack, and precisely what the attestation
proves (this model saw these committed inputs and returned this verdict — **not** that any run reproduces
it).
