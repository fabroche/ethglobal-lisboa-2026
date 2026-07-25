# CLAUDE.md — Seam

**Seam** — sealed two-party negotiation, for **ETHGlobal Lisbon 2026**. Two sides write their terms in
plain language into a sealed session; a model inside a **TEE (0G)** reads both and returns **one line to
both** — `workable` / `not_workable` — without either side, or the operator, ever seeing the other's
terms. **No database, no smart contract, no Solidity.**

> Deadline: **Sunday 26 July, 09:00 WEST.** The Friday-night 0G attestation spike (`npm run spike`,
> backlog `S0.3`) is the whole gamble: if the attestation can't be verified independently, the core
> claim collapses — surface it that night, not Sunday.

## Status — 🎉 the gamble is WON (S0.3, 25 Jul 15:45)
`npm run spike` is **FULL GO, exit 0.** A **real enclave signature verifies against our pinned key**,
using general-purpose crypto only (`@noble/*`) — **no 0G code in the trust path**. Flipping one
character of the real payload is rejected. 149 tests green.

**The signature covers the INPUT as well as the output** — proven empirically, so *"this model saw
these inputs and returned this verdict"* is supported and the pitch needs no rewording. That was the
highest-stakes open question (spec-03 §8.1) and it fell our way.

Three things had to be understood, all of them non-obvious and all written up in
`docs/handoff-open-threads.md` §1:
1. **The Router can never give a signature.** It pays the broker with its own wallet, so the broker's
   customer is the Router, not us. Only a **direct, on-chain-paid** call yields a verifiable response.
   One-time setup: `npm run og:setup` (ledger minimum is **3 0G** — an account-opening floor, not a
   usage cost; a call is ~0.0005 0G).
2. **`OG_ENCLAVE_PUBKEY` is `teeSignerAddress`, not the provider address.** Every source we had
   reached for hands you the provider address, so the wrong value looked corroborated three ways. The
   spike now checks it on-chain, because that key **moves** if the enclave is redeployed.
3. **0G signs a raw string, so canonical serialisation breaks it.** Hence `encoding: "canonical" |
   "utf8"` on the envelope. Getting this wrong fails as `signer_mismatch`, which is indistinguishable
   at a glance from a wrongly pinned key — a test keeps that trap caught.

**We verify the last link and pin the enclave key** — no TDX quote parsing / cert-chain walk to an
Intel root. Say it that way in the Q&A; overstating it is how this demo loses (spec-03 §5).
0G's SDK is a dependency now, for **payment and transport only** — it never judges a signature, and we
deliberately never call `processResponse()`.

## `evaluator` (S2.2) done — and it counts dimensions correctly
`npm run eval:live` is **GO** against the real enclave. Bare verdicts are right with no consent; with
two-sided consent the model returned `gap:multiple` when price *and* timing blocked and `gap:single`
when only timing did, so D9-as-amended works in practice. 225 tests green.

Consent is enforced **twice**: the `gap:*` vocabulary is never offered in the prompt without it, and
`applyConsent` degrades a gap to `not_workable` on the way out — a prompt is a request, and this is a
privacy boundary. `parseVerdict` refuses to extract an enum value out of prose, because recovering one
would make the enum guarantee true in the types and false in reality.

**One honest gap, D-M6-2:** `evaluate()` takes **plaintext**. The router is a chat API, so the enclave
cannot run our ECIES decryption, and `OG_ENCLAVE_SEAL_PUBKEY` is still unanswered. Sealing in the
browser and the ciphertext-only store are real and demonstrable; *"plaintext exists only inside the
TEE"* is **not yet true** — do not say it (spec-02, D-M6-2).

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
npm run spike      # scripts/spike-attest.ts — the 0G go/no-go (S0.3). FULL GO, exit 0
npm run eval:live  # S2.2 evaluator against the real enclave. GO
npm run og:status  # 0G wallet + compute-ledger balance. READ-ONLY, spends nothing
npm run og:setup   # one-time: ledger deposit + acknowledge. DRY RUN unless -- --confirm
npm run inspect    # demo: our store holds only ciphertext (S4.1)
npm run demo:naive # demo: same product without the enclave leaks (S4.2)
```

## Architecture (nine modules, no DB, no contract)
- **Layers**: `app/` (UI) → module libs `src/{session,seal,worldid,registry,scheduler,evaluator}` →
  external SDKs (0G router, `@hashgraph/sdk`, `@worldcoin/idkit`). Env ONLY from `src/config/env.ts`
  (Zod, fail-fast).
- **Storage IS the HCS topic.** Three versioned message types per session (expiry, commitments, verdict).
- **Flow**: open room (pick use case: `property`/`job`/`otc`, D16 — guidance presets, positions stay
  free-form) → publish deadline + `useCase` to Hedera before anyone writes → both write + seal in-browser
  to the enclave key → World Selfie Check (one seat/side) → commitments (`sha256(ciphertext)`) to HCS →
  scheduled reveal → sealed eval in 0G (pinned model, temp 0, use-case prompt hint, enum output) →
  verify attestation (**fail closed**) → verdict to topic → both read via Mirror Node.

## Hard rules (see `agente/guardrails.md`)
- **No Solidity / no smart contracts.** SDKs only.
- **No user private keys, ever.** The only keys we hold are our own **operating** accounts: the Hedera
  testnet account and the 0G mainnet wallet (`OG_WALLET_PRIVATE_KEY`). Seam users have no wallet at all.
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
