# CLAUDE.md — Seam

**Seam** — sealed two-party negotiation, for **ETHGlobal Lisbon 2026**. Two sides write their terms in
plain language into a sealed session; a model inside a **TEE (0G)** reads both and returns **one line to
both** — `workable` / `not_workable` — without either side, or the operator, ever seeing the other's
terms. **No database, no smart contract, no Solidity.**

> Deadline: **Sunday 26 July, 09:00 WEST.** The Friday-night 0G attestation spike (`npm run spike`,
> backlog `S0.3`) is the whole gamble: if the attestation can't be verified independently, the core
> claim collapses — surface it that night, not Sunday.

## Status — the gamble is half won (S0.3, 24 Jul)
`npm run spike` **PART A: GO.** We verify a TEE signature with general-purpose crypto only
(`@noble/*`) — **no 0G code in the trust path**. Tampered payload, tampered signature and wrong
pinned key are all rejected; 40 unit tests green. The vendor package `@foundryprotocol/0gkit-attestation`
turned out to be unresolvable, so **we implement `verifyEnvelope` ourselves** — which satisfies
RNF-M7-001 more convincingly anyway (spec-03 §1).

**PART B (live 0G) has never run** — needs `OG_KEY`/`OG_MODEL`/`OG_ENCLAVE_PUBKEY` in `.env.local`.
So the *design* is proven and the *wire format* is not. Two booth answers can still move us:
whether the signature **covers the input** (if not, the pitch needs rewording), and whether the
enclave pubkey is **stable across requests** (if not, it can't be a static env var). See
`docs/spec-03-attest.md` §8.

**We verify the last link and pin the enclave key** — no TDX quote parsing / cert-chain walk to an
Intel root. Say it that way in the Q&A; overstating it is how this demo loses (spec-03 §5).

**`seal` (S1.4) done.** ECIES to the enclave key, suite tagged in the payload. One correction worth
knowing: **sealing is randomized on purpose.** `M2-seal.md` asked for "same plaintext ⇒ identical
ciphertext", which would leak equality of plaintexts on a public topic and let an attacker confirm a
guessed position offline by comparing commitments — the probing attack from an angle the one-seat
control doesn't cover. A test enforces that two seals of the same text differ (spec-04 §1).

## 🧭 If you are a Claude working on this repo, read in this order
0. **`docs/handoff-open-threads.md`** — what's blocked right now and what to pick up. Read it first.
1. **This file** (context + hard rules).
2. **`docs/branching-strategy.md`** — how we use Git (pull-based, no squash, commit every ~30 min).
3. **`docs/backlog.md`** — claim the next item (commit the claim first) + the **Definition of Done**.
4. **`docs/modules/Mx-*.md`** + **`docs/spec-*.md`** for the item you claimed.
5. **`agente/guardrails.md`** — the lines you must never cross.

## Team & workflow
- **Frank** (Claude, directed by the repo owner) — leans 0G side: `seal`, `evaluator`, `attest`.
- **Dylan** (Claude, directed by the partner) — leans Hedera + World side: `session`, `registry`,
  `scheduler`, `worldid`.
- One **integrator** (repo owner) reviews/merges all PRs. Work is **pull-based** from `docs/backlog.md`;
  branches `develop-frank` / `develop-dylan` → `develop` → `main`. **Repo language: English** (code, docs,
  commits, PRs).

## Commands
```powershell
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
npm run test:e2e   # Playwright (two-browser E2E)
npm run spike      # scripts/spike-attest.ts — the Friday-night 0G go/no-go (S0.3)
npm run inspect    # demo: our store holds only ciphertext (S4.1)
npm run demo:naive # demo: same product without the enclave leaks (S4.2)
```

## Architecture (nine modules, no DB, no contract)
- **Layers**: `app/` (UI) → module libs `src/{session,seal,worldid,registry,scheduler,evaluator}` →
  external SDKs (0G router, `@hashgraph/sdk`, `@worldcoin/idkit`). Env ONLY from `src/config/env.ts`
  (Zod, fail-fast).
- **Storage IS the HCS topic.** Three versioned message types per session (expiry, commitments, verdict).
- **Flow**: open room → publish deadline to Hedera before anyone writes → both write + seal in-browser to
  the enclave key → World Selfie Check (one seat/side) → commitments (`sha256(ciphertext)`) to HCS →
  scheduled reveal → sealed eval in 0G (pinned model, temp 0, enum output) → verify attestation
  (**fail closed**) → verdict to topic → both read via Mirror Node.

## Hard rules (see `agente/guardrails.md`)
- **No Solidity / no smart contracts.** SDKs only.
- **No user private keys, ever.** The only key we hold is our own Hedera testnet account.
- **Enclave emits enum only** (never free text) — leak control. **Fail closed**: no valid attestation ⇒
  no verdict published.
- Validate every external response (0G / Hedera / World) with **Zod**. Secrets never in the repo.
- The **two hard parts**: `attest` (verify TEE signature outside the SDK, `verifyEnvelope`) and `seal`
  commitment (deterministic serialisation; hash the ciphertext; no timestamp in committed bytes).

## Definition of Done (merge gate — every backlog item)
Tested (**RTL** for components, **unit** for module logic, **Playwright E2E** for critical flows) ·
**Storybook story** for non-trivial UI · **documented** (update the module doc + this file's status +
`docs/ai-usage.md`) · spec committed **before** code · `typecheck`+`lint`+`test`+`build` green. A component
isn't done because it runs — it's done when it's **tested, story'd, documented, and green**. Full checklist
in `docs/backlog.md`.

## Sponsors (3 partner slots — the max) — all load-bearing
| Track | Pool (approx) | Why it can't be removed |
|---|---|---|
| 0G — Best AI Product | $6,000 | Sealed inference IS the product |
| World — Selfie Check Beta | $3,500 | One seat per side; kills the probing attack |
| Hedera — No Solidity Allowed | $3,000 | HCS + Schedule + Mirror Node, zero Solidity |

## Event rules (do not break — they disqualify)
- **Commit every ~30 min** from hour one. Single giant commits / missing history can disqualify.
- **AI attribution mandatory** → keep `docs/ai-usage.md` updated; commits carry `Co-Authored-By: Claude`.
- **Spec-driven** → commit `docs/spec-*.md` before the code. **Never squash** PRs.
- **Video**: 2–4 min, 720p+, **no AI voiceover**.

## Map
- Specs: **`docs/`** (start at `docs/README.md`) — vision, architecture, data model (HCS messages),
  module docs (RF/RNF), sponsor integrations, security & privacy, conventions, open decisions.
- Dev context: **`agente/`** (`stack.md`, `guardrails.md`). Primers: `docs/web3-concepts.md`,
  `docs/seam-flow-example.md`.
- Subagents: **`.claude/agents/`** — `frontend`, `zerog`, `hedera`, `world`, `devops`, `qa-testing`.

## Setup
1. `cp .env.example .env.local` and fill (0G, Hedera testnet, World). 2. `npm install`. 3. `npm run dev`.
