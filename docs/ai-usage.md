# AI usage & attribution

Status: 🟧 draft · **keep updated all weekend.**

ETHGlobal rules require disclosing which parts of the project were AI-assisted. This document is that
disclosure.

## Policy
- **Every AI-assisted file is logged** in the table below.
- **Commits carry `Co-Authored-By: Claude`** when AI contributed to the change.
- We use a **spec-driven workflow**: the spec files (`docs/spec-0x-*.md`) and the prompts that drove the
  work are **committed to the repo**, not left in chat history.
- **Humans direct and review everything.** The AI drafts under explicit instruction; a human reads,
  edits, tests and is accountable for every merged line. AI output is never merged unread.
- No AI voiceover in the submission video (auto-reject) — narration is human.

## Concrete human decisions (not generic — each is traceable in the repo)

- **The idea itself and the kill-test.** The pivot away from sponsor-first ideas to Seam, and the
  "each sponsor load-bearing or drop the idea" test — see `idea-brainstorm.md`. Humans set the
  design constraint; the AI worked inside it.
- **The D9 amendment came from a human catching the AI's flaw** (25 Jul). Dylan spotted that
  "reveal the single blocking dimension" wrongly assumed a unique blocker, **rejected the AI's
  first fix** (a priority-order pick) as a workaround that fabricates answers, and proposed the
  final design himself: `gap:single` | `gap:multiple` — count, never which. Trail: DA1 in
  `00-overview/05-open-decisions.md`, D9 in the ledger, PR #12.
- **D16 was a human choice between argued options.** Free-form positions + guidance presets vs.
  parsed criteria: the AI laid out trade-offs, Dylan decided, and defined the property criteria
  (price, CPCV amount, CPCV date, CPCV→deed duration) from domain knowledge.
- **Frank/integrator gatekeeping.** Every PR is human-reviewed and merged by the integrator;
  the D9 vocabulary change additionally required Frank's explicit agreement before it shipped.
- **Sponsor workshops and credentials** (DA3–DA7 confirmations, World/0G keys) — humans at the
  booths; the AI only consumed the answers.
- **Humans repeatedly caught and redirected the AI** — the reviews were real, not ceremonial.
  Traceable examples beyond D9: the AI claimed World credentials were configured when the UI
  correctly said otherwise (it had checked env variable *names*, not values — human caught the
  discrepancy, 25 Jul); the AI advised against enabling World ID 4.0 before reading the current
  docs, and reversed after a human insisted on reading them (Selfie Check turned out 4.x-only);
  two proposed workarounds were rejected by humans demanding root-cause fixes (the D9 vocabulary,
  and serving HTTPS for WebCrypto instead of dodging the phone flow — `world-testing.md` §A.8);
  and grep-based investigation was rejected in favour of full-source reading, which upgraded a
  hypothesis into the proven failure line in IDKit's `bridge.ts`.

## Attribution table
| File / Area | AI-assisted? | Notes |
|-------------|:------------:|-------|
| `docs/**` (this documentation set) | ✅ | Generated with Claude Code under human direction; human-reviewed. RF/RNF specs, architecture, threat model, transversal docs. Incl. the D16 use-case-preset decision records (README ledger, open-decisions DA8, data-model, spec-01/02, M1/M6/M8, backlog S3.5). |
| `CLAUDE.md` | ✅ | Maintained with Claude Code (status + flow updates); human-reviewed. |
| `docs/spec-01-session.md` · `spec-02-evaluator.md` · `spec-03-attest.md` · `spec-04-seal.md` | ✅ | Specs written before code (spec-driven rule). |
| `docs/ux/**` | ✅ | Screens, sitemap, wireframes and the sponsor-value map, drafted with Claude Code from the existing specs; bilingual (EN canonical, ES mirror) for the team design review. |
| Project scaffold (Next.js 16 · Tailwind v4 · shadcn) | ✅ | Boilerplate generated; config reviewed by a human. |
| `src/session/**` | ✅ | M1/S1.2 domain layer (messages, room, createRoom orchestrator, commitment gate) + **S3.5** `usecases.ts` (D16 preset map + `useCase` on the expiry message) + co-located Vitest unit tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/seal/**` (+ tests) | ✅ | M2/S1.4. ECIES hybrid encryption + commitment, drafted with Claude Code under human direction. Safety-critical: the decision to make sealing **randomized** (against the module doc's literal wording) was raised by the AI, reasoned through in spec-04 §1, and human-reviewed. 23 unit tests. |
| `src/worldid/**` | ✅ | M3/S1.5 verify + seat logic (per-room-per-side action scoping, `WorldVerifier` port, one-seat gate, fail-closed `claimSeat`, isolated `verifyCloudProof` adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/registry/**` · `scripts/inspect.ts` | ✅ | M4 write path (S1.3: Hedera SDK boundary, `createRegistry`→`RegistryPort`) + read path (S2.5: Mirror Node boundary, `createReader`, base64/Zod decode, sequence-gap check) + **S2.7** (shared `src/lib/canonical.ts`) + **S4.1** (`inspect.ts` demo + `summarizeTopic`/`holdsOnlyHashes` proving the topic holds only hashes) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/scheduler/**` | ✅ | M5/S2.4 arm/fire logic (`ScheduleService` port, `armReveal` future-only, idempotent `onRevealFired`, DA5 fallback timer, isolated Hedera Schedule Service adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/evaluator/**` | ⬜ | To fill when built (M6). |
| `src/lib/canonical.ts` (+ test) | ✅ | M7/S0.3, shared. Canonical serialization for the signed bytes, drafted with Claude Code under human direction. Safety-critical (determinism) — 16 unit tests, human-reviewed. Lives in `lib/` because `attest`, `seal` and `registry` must agree byte-for-byte (S2.7). |
| `src/evaluator/attest.ts` (+ test) | ✅ | M7/S0.3. Independent `verifyEnvelope` — signature recovery + fail-closed gate. Drafted with Claude Code; the design decision to drop the unresolvable vendor package and verify with general-purpose crypto was made explicitly (spec-03 §1). 24 unit tests. |
| `src/evaluator/attest-testkit.ts` | ✅ | M7/S0.3. Ephemeral-key signing helpers for the spike + tests. **Not a production path** — Seam never signs anything. |
| `scripts/spike-attest.ts` | ✅ | M7/S0.3, the Friday-night spike. PART A (offline) passes; PART B (live 0G) pending credentials + booth answers. Human-verified against the 0G booth answers. |
| `src/components/web/**` · `src/app/create/**` · `src/app/room/**` | ✅ | M8 web screens: create (S3.1: `create-room-form`, `room-qr`; S3.5: `use-case-picker`), join landing, write+seal (S3.2: `seal-position-form`, `position-checklist`, `selfie-check-gate` + `submitCommitmentAction`), and verdict (S3.3: `countdown`, `verdict-panel`, `verdict-view`) + stories + RTL, and the routes/Server Actions wiring M1–M4. Drafted with Claude Code under human direction; human-reviewed. |
| Submission video | ❌ | Human narration only (no AI voiceover — track rule). |

Legend: ✅ AI-assisted · ⬜ pending (fill when built) · ❌ not AI-assisted.
