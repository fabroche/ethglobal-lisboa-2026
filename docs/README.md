# Overlap — Technical Documentation

**ETHGlobal Lisbon 2026** · submission deadline **Sunday 26 July, 09:00 WEST**.

Pre-implementation design documentation for **Overlap**: sealed two-party negotiation.
Two sides write their negotiating position in plain language; a model inside a **0G TEE
(sealed inference)** reads both and returns **one enum verdict to both** — `workable` /
`not_workable` (optionally whether **one issue or several** block — `gap:single` / `gap:multiple`,
never *which* — if **both** opted in).
Neither side, nor the operator, ever sees the other's terms.

**No database. No smart contract. No Solidity.** Storage *is* an Hedera Consensus Service
(HCS) topic. The stack (Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Zod)
is reused from `home-os`, minus Supabase.

> **Level of detail:** hackathon design docs. The overview and transversal docs are the most
> closed; module specs follow the RF/RNF house format and are proportional to module size.

---

## Organisation (2-level hybrid)

- **OVERVIEW** (`00-overview/`) — vision & scope, layered/C4 architecture, the HCS message
  schemas (there is **no relational data model**), the sponsor/prize map, conventions, and
  the open-decisions ledger.
- **MODULES** (`modules/`) — one RF/RNF document per module (`M1`…`M8`), mapped to backlog
  IDs (`S0.x`…`S5.x`).
- **TRANSVERSAL** (`transversal/`) — the three sponsor integrations (0G, Hedera, World), the
  security & privacy threat model, design system, mobile-first, quality & testing, infra/DevOps.
- **UX** (`ux/`) — screens, sitemap, wireframes and the sponsor-visibility map, for the design
  discussion between the two workstreams. **Bilingual** (EN canonical + ES mirror) — the one
  deliberate exception to D2.
- **SPECS** (`spec-0x-*.md`) — short spec stubs committed **before** the code (spec-driven rule).
  Four of them: session, evaluator, attest, seal.
- **PLANNING & COMPLIANCE** — `backlog.md` (the single source of truth for who is on what),
  `ai-usage.md` (AI attribution — a track requirement), `world-testing.md` (World's testing
  doc — also a track requirement), `output-vocabulary.md`, `branching-strategy.md`,
  `video-script.md`.
- **PRIMERS** — start with **the encyclopedia**
  ([EN](./encyclopedia-overlap.html) · [ES](./enciclopedia-overlap.es.html)): the whole system in
  one page — mental map, the walk-through step by step, what the data really looks like, the
  cryptography in detail, what we prove and what we don't, and **§10 the hard questions** (the
  ones a judge will actually ask). Bilingual, like `ux/` — a deliberate exception to D2.
  Then `web3-concepts.md` (for a web2 developer) and `seam-flow-example.md` (the worked example:
  selling a house).
- **HANDOFFS** (`handoffs/`) — session hand-over notes between the two workstreams. Written to
  be picked up cold; `handoff-open-threads.md` is the live one.
- **HISTORY** (`history/`) — how we got here, kept because the reasoning is part of the
  submission: the idea brainstorm, the booth question list, the two pre-rename product briefs,
  the encyclopedia pages and the original brainstorm PDFs. **Nothing here is current** — read
  the root `README.md` for what the product is today.
- **TEMPLATES** (`_templates/`) — base for new modules and features.

```
docs/
  README.md
  00-overview/{00-vision-scope,01-architecture,02-data-model,03-sponsors-prizes,04-conventions,05-open-decisions}.md
  modules/{M1-session,M2-seal,M3-worldid,M4-registry,M5-scheduler,M6-evaluator,M7-attest,M8-web}.md
  transversal/{integration-0g,integration-hedera,integration-worldid,security-and-privacy,design-system,mobile-first,quality-and-testing,infra-devops}.md
  ux/{README,invite-message,screens-and-sitemap,screens-and-sitemap.es}.md
  handoffs/{handoff-open-threads,handoff-frank-validaciones.es,handoff-s2.7-canonical}.md
  history/{idea-brainstorm,booth-questions,seam-brief,seam-updated}.md + brainstorm .pdf
  encyclopedia-overlap.html · enciclopedia-overlap.es.html
  spec-01-session.md · spec-02-evaluator.md · spec-03-attest.md · spec-04-seal.md
  backlog.md · ai-usage.md · world-testing.md · output-vocabulary.md
  branching-strategy.md · video-script.md
  web3-concepts.md · seam-flow-example.md
  _templates/{module,feature}.md
```

---

## Module map

| ID | Module | Backlog | Sponsor | Status |
|----|--------|---------|---------|:------:|
| M1 | `session` — create room, publish deadline to HCS **before** any write, issue link/QR | S1.2 | Hedera | 🟧 draft |
| M2 | `seal` (client) — in-browser hybrid encryption to enclave key; deterministic commitment | S1.4 | 0G | 🟧 draft |
| M3 | `worldid` — Selfie Check, one nullifier per room per side | S1.5 | World | 🟧 draft |
| M4 | `registry` — write commitments + verdict to HCS, read via Mirror Node, versioned messages | S1.3 / S2.5 / S2.6 | Hedera | 🟧 draft |
| M5 | `scheduler` — arm + listen for the scheduled reveal | S2.4 | Hedera | 🟧 draft |
| M6 | `evaluator` — 0G call, pinned model, temp 0, constrained enum output | S2.2 | 0G | 🟧 draft |
| M7 | `attest` — verify the TEE signature independently, fail closed (Friday-night spike) | S0.3 / S2.3 | 0G | 🟧 draft |
| M8 | `web` — three screens (create · write+seal · verdict), two-browser E2E + QR | S3.x | web | 🟧 draft |

### Transversal & compliance

| ID | Document | Status |
|----|----------|:------:|
| T-0G | Integration — 0G sealed inference | 🟧 draft |
| T-HE | Integration — Hedera (HCS · Schedule · Mirror) | 🟧 draft |
| T-WO | Integration — World Selfie Check | 🟧 draft |
| T-SEC | Security & privacy (threat model) | 🟧 draft |
| T-DS | Design system | 🟧 draft |
| T-MF | Mobile-first | 🟧 draft |
| T-QA | Quality & testing | 🟧 draft |
| T-IN | Infra & DevOps (deploy TBD) | 🟧 draft |
| T-UX | UX — screens, sitemap & sponsor value (`ux/`, EN + ES) | 🟧 draft |
| C-AI | AI-usage attribution | 🟧 draft |

---

## Architecture decision ledger

| # | Decision | Detail |
|---|----------|--------|
| D1 | **Stack reused from `home-os`, Supabase-free** | Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Zod. No Supabase, no Postgres, no ORM. |
| D2 | **English only** | Docs, code, commits, UI in English. Web3/crypto terms (TEE, enclave, attestation, nullifier, HCS) stay as-is. |
| D3 | **No Solidity / no smart contracts** | Zero contracts written or deployed. All three sponsors are used through native SDKs/services. This *is* the Hedera "No Solidity Allowed" track. |
| D4 | **No database — storage IS the HCS topic** | No relational DB, no ORM, no server-side store of terms. The Hedera Consensus Service topic holds the three versioned message types (expiry, commitments, verdict). |
| D5 | **Sealed inference via 0G** | The comparison runs inside a 0G TeeML enclave; the operator cannot see the inputs. This is the whole reason the product is trustable, not a feature. |
| D6 | **Hedera = three native services** | HCS (commitments + verdict log), Schedule Service (the deadline clock), Mirror Node (read path). Testnet account; keys are **ours only**. |
| D7 | **World = one seat per side, not login** | Selfie Check as an anti-probing abuse signal. Nullifier scoped **per room per side**, not app-wide. |
| D8 | **No user private keys** | We hold only our own Hedera testnet account key. Users never sign anything; there are no wallets in the flow. |
| D9 | **Constrained enum output** | The enclave emits `workable` / `not_workable` (+ opt-in `gap:single` \| `gap:multiple`) and never free text. Enum in, enum out — the leak control. **Amended 25 Jul:** gap disclosure reveals whether **one or several** dimensions block, never *which* — "the single blocking dimension" was ill-defined (several can block at once, and entangled tradeoffs have no unique blocker; naming one would fabricate an answer). The dimensions (compensation/timing/scope) survive **inside the enclave only**, as the counting basis for single-vs-multiple. |
| D10 | **Fail closed** | A verdict is published only if the TEE attestation verifies **independently** of the 0G SDK (`verifyEnvelope`). Bad signature ⇒ no verdict. |
| D11 | **Zod at all boundaries** | Every external response (0G, Hedera SDK, Mirror Node REST, World) is validated with Zod before use. No `as any`. |
| D12 | **Deterministic commitment** | `sha256(ciphertext)` over canonically serialised bytes; no clock timestamp inside the committed bytes, so the verifier recomputes the same hash. |
| D13 | **Mermaid diagrams** | All diagrams embedded as Mermaid, versioned per PR. |
| D14 | **date-fns** | Deadlines / consensus timestamps handled with date-fns (no Moment). |
| D15 | **Deploy TBD — Vercel vs VPS** | Vercel is fast for the hackathon; a Hostinger VPS + Dokploy path exists as the fallback. No worker, no DB either way. See `transversal/infra-devops.md`. |
| D17 | **The World action is scoped per ROOM, not per side** | The nullifier is `f(app_id, action, person)`. Until 26 Jul the action carried the side (`overlap-<roomId>-<side>`), so the same human got a **different valid nullifier for each side** and **one phone could take both seats** — found live by the owner. Now `overlap-<roomId>`: both seats derive from one action, so World's own `max_verifications: 1` refuses the second verification (server-side, and it survives our process restarting), and any reader of the topic can compare the two published nullifiers — equal ⇒ one human played both sides. Rooms stay unlinkable from each other, which is what per-side scoping was protecting. **Cost:** a room needs two distinct World identities, so there is no solo demo. |
| D16 | **Free-form positions + use-case guidance presets** | Positions stay plain language in one sealed blob — no structured criteria, no parsing (a parser can't live client-side reliably or server-side privately, and fully structured input would reduce the sealed model to arithmetic). A **use-case preset** (`property` \| `job` \| `otc`) sets side labels, placeholder text, a **non-blocking** checklist on the write screen, and a per-use-case hint in the enclave prompt. `useCase` is public metadata in the expiry message; the sealed payload and commitment path are unchanged (D12). Presets live in `src/session/usecases.ts` (single source for M1/M6/M8). |

---

## Document states

`⬜ pending` → `🟧 draft` → `🟨 review` → `🟩 approved`

Prize amounts are marked **"approx — confirm at booth"** wherever they appear; sponsor pages
changed once mid-event, so re-read them before submitting.
