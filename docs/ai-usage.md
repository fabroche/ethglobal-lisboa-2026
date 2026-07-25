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

## Attribution table
| File / Area | AI-assisted? | Notes |
|-------------|:------------:|-------|
| `docs/**` (this documentation set) | ✅ | Generated with Claude Code under human direction; human-reviewed. RF/RNF specs, architecture, threat model, transversal docs. Incl. the D16 use-case-preset decision records (README ledger, open-decisions DA8, data-model, spec-01/02, M1/M6/M8, backlog S3.5). |
| `CLAUDE.md` | ✅ | Maintained with Claude Code (status + flow updates); human-reviewed. |
| `docs/spec-01-session.md` · `spec-02-evaluator.md` · `spec-03-attest.md` · `spec-04-seal.md` | ✅ | Specs written before code (spec-driven rule). |
| `docs/ux/**` | ✅ | Screens, sitemap, wireframes and the sponsor-value map, drafted with Claude Code from the existing specs; bilingual (EN canonical, ES mirror) for the team design review. |
| Project scaffold (Next.js 16 · Tailwind v4 · shadcn) | ✅ | Boilerplate generated; config reviewed by a human. |
| `src/session/**` | ✅ | M1/S1.2 domain layer (messages, room, createRoom orchestrator, commitment gate) + co-located Vitest unit tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/seal/**` (+ tests) | ✅ | M2/S1.4. ECIES hybrid encryption + commitment, drafted with Claude Code under human direction. Safety-critical: the decision to make sealing **randomized** (against the module doc's literal wording) was raised by the AI, reasoned through in spec-04 §1, and human-reviewed. 23 unit tests. |
| `src/worldid/**` | ✅ | M3/S1.5 verify + seat logic (per-room-per-side action scoping, `WorldVerifier` port, one-seat gate, fail-closed `claimSeat`, isolated `verifyCloudProof` adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/registry/**` · `scripts/inspect.ts` | ✅ | M4 write path (S1.3: Hedera SDK boundary, `createRegistry`→`RegistryPort`) + read path (S2.5: Mirror Node boundary, `createReader`, base64/Zod decode, sequence-gap check) + **S2.7** (shared `src/lib/canonical.ts`) + **S4.1** (`inspect.ts` demo + `summarizeTopic`/`holdsOnlyHashes` proving the topic holds only hashes) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/scheduler/**` | ✅ | M5/S2.4 arm/fire logic (`ScheduleService` port, `armReveal` future-only, idempotent `onRevealFired`, DA5 fallback timer, isolated Hedera Schedule Service adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/evaluator/**` | ⬜ | To fill when built (M6). |
| `src/lib/canonical.ts` (+ test) | ✅ | M7/S0.3, shared. Canonical serialization for the signed bytes, drafted with Claude Code under human direction. Safety-critical (determinism) — 16 unit tests, human-reviewed. Lives in `lib/` because `attest`, `seal` and `registry` must agree byte-for-byte (S2.7). |
| `src/evaluator/attest.ts` (+ test) | ✅ | M7/S0.3. Independent `verifyEnvelope` — signature recovery + fail-closed gate. Drafted with Claude Code; the design decision to drop the unresolvable vendor package and verify with general-purpose crypto was made explicitly (spec-03 §1). 24 unit tests. |
| `src/evaluator/attest-testkit.ts` | ✅ | M7/S0.3. Ephemeral-key signing helpers for the spike + tests. **Not a production path** — Seam never signs anything. |
| `scripts/spike-attest.ts` | ✅ | M7/S0.3, the Friday-night spike. PART A (offline) passes; PART B (live 0G) pending credentials + booth answers. Human-verified against the 0G booth answers. |
| `src/components/web/**` · `src/app/create/**` · `src/app/room/**` | ✅ | M8 web screens: create (S3.1: `create-room-form`, `room-qr`), join landing, and verdict (S3.3: `countdown`, `verdict-panel`, `verdict-view`) + stories + RTL, and the routes/Server Actions wiring M1/M4. Drafted with Claude Code under human direction; human-reviewed. |
| Submission video | ❌ | Human narration only (no AI voiceover — track rule). |

Legend: ✅ AI-assisted · ⬜ pending (fill when built) · ❌ not AI-assisted.
