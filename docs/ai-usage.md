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
| `docs/**` (this documentation set) | ✅ | Generated with Claude Code under human direction; human-reviewed. RF/RNF specs, architecture, threat model, transversal docs. |
| `docs/spec-01-session.md` · `spec-02-evaluator.md` · `spec-03-attest.md` | ✅ | Specs written before code (spec-driven rule). |
| Project scaffold (Next.js 16 · Tailwind v4 · shadcn) | ✅ | Boilerplate generated; config reviewed by a human. |
| `src/session/**` | ✅ | M1/S1.2 domain layer (messages, room, createRoom orchestrator, commitment gate) + co-located Vitest unit tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/seal/**` | ⬜ | To fill when built (M2) — the deterministic commitment is safety-critical; expect close human review. |
| `src/worldid/**` | ✅ | M3/S1.5 verify + seat logic (per-room-per-side action scoping, `WorldVerifier` port, one-seat gate, fail-closed `claimSeat`, isolated `verifyCloudProof` adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/registry/**` | ✅ | M4 write path (S1.3: canonical JSON, Hedera SDK boundary, `createRegistry`→`RegistryPort`) + read path (S2.5: Mirror Node boundary, `createReader`, base64/Zod decode, sequence-gap check) + co-located Vitest unit/integration tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/scheduler/**` | ✅ | M5/S2.4 arm/fire logic (`ScheduleService` port, `armReveal` future-only, idempotent `onRevealFired`, DA5 fallback timer, isolated Hedera Schedule Service adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/evaluator/**` | ⬜ | To fill when built (M6). |
| `src/attest/**` · `scripts/spike-attest.ts` | ⬜ | To fill when built (M7) — the Friday-night spike; human-verified against the 0G booth answers. |
| `src/components/web/**` · `src/app/create/**` · `src/app/room/**` | ✅ | M8 web screens: create (S3.1: `create-room-form`, `room-qr`), join landing, and verdict (S3.3: `countdown`, `verdict-panel`, `verdict-view`) + stories + RTL, and the routes/Server Actions wiring M1/M4. Drafted with Claude Code under human direction; human-reviewed. |
| Submission video | ❌ | Human narration only (no AI voiceover — track rule). |

Legend: ✅ AI-assisted · ⬜ pending (fill when built) · ❌ not AI-assisted.
