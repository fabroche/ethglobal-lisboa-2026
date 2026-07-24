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
| `docs/ux/**` | ✅ | Screens, sitemap, wireframes and the sponsor-value map, drafted with Claude Code from the existing specs; bilingual (EN canonical, ES mirror) for the team design review. |
| Project scaffold (Next.js 16 · Tailwind v4 · shadcn) | ✅ | Boilerplate generated; config reviewed by a human. |
| `src/session/**` | ⬜ | To fill when built (M1). |
| `src/seal/**` | ⬜ | To fill when built (M2) — the deterministic commitment is safety-critical; expect close human review. |
| `src/worldid/**` | ⬜ | To fill when built (M3). |
| `src/registry/**` | ⬜ | To fill when built (M4). |
| `src/scheduler/**` | ⬜ | To fill when built (M5). |
| `src/evaluator/**` | ⬜ | To fill when built (M6). |
| `src/evaluator/canonical.ts` (+ test) | ✅ | M7/S0.3. Canonical serialization for the signed bytes, drafted with Claude Code under human direction. Safety-critical (determinism) — 16 unit tests, human-reviewed. |
| `src/evaluator/attest.ts` (+ test) | ✅ | M7/S0.3. Independent `verifyEnvelope` — signature recovery + fail-closed gate. Drafted with Claude Code; the design decision to drop the unresolvable vendor package and verify with general-purpose crypto was made explicitly (spec-03 §1). 24 unit tests. |
| `src/evaluator/attest-testkit.ts` | ✅ | M7/S0.3. Ephemeral-key signing helpers for the spike + tests. **Not a production path** — Seam never signs anything. |
| `scripts/spike-attest.ts` | ✅ | M7/S0.3, the Friday-night spike. PART A (offline) passes; PART B (live 0G) pending credentials + booth answers. Human-verified against the 0G booth answers. |
| `src/web/**` | ⬜ | To fill when built (M8). |
| Submission video | ❌ | Human narration only (no AI voiceover — track rule). |

Legend: ✅ AI-assisted · ⬜ pending (fill when built) · ❌ not AI-assisted.
