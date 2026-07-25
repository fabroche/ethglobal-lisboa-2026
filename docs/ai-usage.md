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
| `docs/spec-01-session.md` · `spec-02-evaluator.md` · `spec-03-attest.md` · `spec-04-seal.md` | ✅ | Specs written before code (spec-driven rule). |
| `docs/ux/**` | ✅ | Screens, sitemap, wireframes and the sponsor-value map, drafted with Claude Code from the existing specs; bilingual (EN canonical, ES mirror) for the team design review. |
| Project scaffold (Next.js 16 · Tailwind v4 · shadcn) | ✅ | Boilerplate generated; config reviewed by a human. |
| `src/session/**` | ✅ | M1/S1.2 domain layer (messages, room, createRoom orchestrator, commitment gate) + co-located Vitest unit tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/seal/**` (+ tests) | ✅ | M2/S1.4. ECIES hybrid encryption + commitment, drafted with Claude Code under human direction. Safety-critical: the decision to make sealing **randomized** (against the module doc's literal wording) was raised by the AI, reasoned through in spec-04 §1, and human-reviewed. 23 unit tests. |
| `src/worldid/**` | ✅ | M3/S1.5 verify + seat logic (per-room-per-side action scoping, `WorldVerifier` port, one-seat gate, fail-closed `claimSeat`, isolated `verifyCloudProof` adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/registry/**` | ✅ | M4 write path (S1.3: Hedera SDK boundary, `createRegistry`→`RegistryPort`) + read path (S2.5: Mirror Node boundary, `createReader`, base64/Zod decode, sequence-gap check) + **S2.7** (migrated onto the shared `src/lib/canonical.ts`, deleted the duplicate serializer) + co-located Vitest unit/integration tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/scheduler/**` | ✅ | M5/S2.4 arm/fire logic (`ScheduleService` port, `armReveal` future-only, idempotent `onRevealFired`, DA5 fallback timer, isolated Hedera Schedule Service adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/evaluator/**` | ⬜ | To fill when built (M6). |
| `src/lib/canonical.ts` (+ test) | ✅ | M7/S0.3, shared. Canonical serialization for the signed bytes, drafted with Claude Code under human direction. Safety-critical (determinism) — 16 unit tests, human-reviewed. Lives in `lib/` because `attest`, `seal` and `registry` must agree byte-for-byte (S2.7). |
| `src/evaluator/attest.ts` (+ test) | ✅ | M7/S0.3. Independent `verifyEnvelope` — signature recovery + fail-closed gate. Drafted with Claude Code; the decision to drop the unresolvable vendor package and verify with general-purpose crypto was made explicitly (spec-03 §1). The `encoding: canonical / utf8` field was added after a REAL 0G signature failed under canonical serialization — the AI diagnosed that `signer_mismatch` was masking a byte-framing bug, not a wrong key. 30 unit tests, incl. a real enclave signature as fixture. |
| `src/evaluator/attest-testkit.ts` | ✅ | M7/S0.3. Ephemeral-key signing helpers for the spike + tests. **Not a production path** — Seam never signs anything. |
| `scripts/spike-attest.ts` | ✅ | M7/S0.3, the spike. **FULL GO (25 Jul):** PART A offline + PART B against live 0G, exit 0. Drafted with Claude Code; the AI traced the Router-vs-broker split (the Router pays with its own wallet, so it can never obtain a signature), read the signature route out of the 0G SDK without depending on it, resolved the broker URL and `teeSignerAddress` on-chain, and settled spec-03 §8.1 empirically. Human-directed and human-reviewed. |
| `scripts/og-wallet-status.ts` · `scripts/og-setup.ts` | ✅ | 0G operating-wallet diagnostics and one-time on-chain setup (ledger deposit + `acknowledgeProviderSigner`). Drafted with Claude Code. Safety-relevant and reviewed as such: `og:status` is read-only and never prints the private key (only the derived, public address); `og:setup` is **dry-run by default** and spends only with an explicit `--confirm`. The human executed and verified the mainnet transactions. |
| `src/components/web/**` · `src/app/create/**` · `src/app/room/**` | ✅ | M8 web screens: create (S3.1: `create-room-form`, `room-qr`), join landing, and verdict (S3.3: `countdown`, `verdict-panel`, `verdict-view`) + stories + RTL, and the routes/Server Actions wiring M1/M4. Drafted with Claude Code under human direction; human-reviewed. |
| Submission video | ❌ | Human narration only (no AI voiceover — track rule). |

Legend: ✅ AI-assisted · ⬜ pending (fill when built) · ❌ not AI-assisted.
