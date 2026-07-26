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

- **The idea itself and the kill-test.** The pivot away from sponsor-first ideas to Overlap, and the
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
- **Later the same night, the pattern repeated and humans kept catching it:** the AI's first root
  cause for the World `invalid_action` failure (unregistered actions) was wrong — Dylan demanded
  certainty instead of acceptance, and deeper probing of World's own endpoints and open-source
  portal proved the real cause (the legacy v2 verify endpoint cannot see new-generation apps'
  actions; the fix moved verification to v4). The AI also: silently failed a server restart and
  reported stale-server results as a fix (caught by Dylan's retest, then fixed with build-ID
  verification); corrupted `docs/backlog.md` with a careless scripted edit — 127 duplicated rows
  committed and pushed — repaired forward after the humans stopped it; and shipped a create flow
  where the creator's side was silently hardwired, which Dylan exposed in live testing (both
  parties entered as "Buyer") and redesigned himself: role declaration at creation plus a context
  anchor (the announcement link) — the AI implemented his design.

## Attribution table
| File / Area | AI-assisted? | Notes |
|-------------|:------------:|-------|
| `docs/**` (this documentation set) | ✅ | Generated with Claude Code under human direction; human-reviewed. RF/RNF specs, architecture, threat model, transversal docs. Incl. the D16 use-case-preset decision records (README ledger, open-decisions DA9, data-model, spec-01/02, M1/M6/M8, backlog S3.5). |
| `CLAUDE.md` | ✅ | Maintained with Claude Code (status + flow updates); human-reviewed. |
| `docs/spec-01-session.md` · `spec-02-evaluator.md` · `spec-03-attest.md` · `spec-04-seal.md` | ✅ | Specs written before code (spec-driven rule). |
| `docs/ux/**` | ✅ | Screens, sitemap, wireframes and the sponsor-value map, drafted with Claude Code from the existing specs; bilingual (EN canonical, ES mirror) for the team design review. |
| Project scaffold (Next.js 16 · Tailwind v4 · shadcn) | ✅ | Boilerplate generated; config reviewed by a human. |
| `src/session/**` | ✅ | M1/S1.2 domain layer (messages, room, createRoom orchestrator, commitment gate) + **S3.5** `usecases.ts` (D16 preset map + `useCase` on the expiry message) + co-located Vitest unit tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/seal/**` (+ tests) | ✅ | M2/S1.4. ECIES hybrid encryption + commitment, drafted with Claude Code under human direction. Safety-critical: the decision to make sealing **randomized** (against the module doc's literal wording) was raised by the AI, reasoned through in spec-04 §1, and human-reviewed. 23 unit tests. |
| `src/worldid/**` | ✅ | M3/S1.5 verify + seat logic (per-room-per-side action scoping, `WorldVerifier` port, one-seat gate, fail-closed `claimSeat`, isolated `verifyCloudProof` adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/registry/**` · `scripts/inspect.ts` | ✅ | M4 write path (S1.3: Hedera SDK boundary, `createRegistry`→`RegistryPort`) + read path (S2.5: Mirror Node boundary, `createReader`, base64/Zod decode, sequence-gap check) + **S2.7** (shared `src/lib/canonical.ts`) + **S4.1** (`inspect.ts` demo + `summarizeTopic`/`holdsOnlyHashes` proving the topic holds only hashes) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/scheduler/**` | ✅ | M5/S2.4 arm/fire logic (`ScheduleService` port, `armReveal` future-only, idempotent `onRevealFired`, DA5 fallback timer, isolated Hedera Schedule Service adapter) + co-located Vitest tests. Drafted with Claude Code under human direction; human-reviewed. |
| `src/evaluator/{verdict,prompt,evaluate,og-request,og-client}.ts` (+ tests) | ✅ | M6/S2.2. Sealed evaluation: the closed output vocabulary + consent gate, the prompt, orchestration behind a `SealedModel` port, and the 0G adapter. Drafted with Claude Code under human direction; human-reviewed. Privacy-critical, and reviewed as such — two decisions were raised by the AI rather than specified: **(1)** two-sided consent is enforced on the way OUT (`applyConsent`), not only requested in the prompt, since a prompt is a request and this is a privacy boundary; **(2)** `parseVerdict` refuses to extract an enum value from prose, because recovering one would make the enum guarantee hold in the types and not in reality. The AI also found, by calling the live enclave, that the provider serves `0GM-1.0-35B-A3B-0427` while the catalog advertises `0gm-1.0-35b-a3b` — exact model matching rejected the pinned model, hence prefix matching plus recording the exact snapshot. 56 unit tests against a fake model. |
| `scripts/eval-live.ts` | ✅ | S2.2 acceptance against the real enclave (`npm run eval:live`), on deliberately unambiguous cases so a wrong verdict means the prompt is wrong rather than the negotiation being close. Drafted with Claude Code; the human ran it and reviewed the verdicts. |
| `scripts/demo-naive.ts` · `scripts/lib/sealed-model.ts` | ✅ | S4.2, Act 3 of the demo: the same product without the enclave, showing the operator reads both positions in the clear. Drafted with Claude Code under human direction. Two judgement calls were the AI's: **(1)** the naive path is written as the *correct* way any competent team would build this, not a strawman — the leak follows from a model needing to read the words, not from carelessness; **(2)** the script states out loud that sealing moves *where* plaintext exists rather than eliminating it, so the demo cannot be accused of overclaiming. `--live` asks the real enclave and prints the identical verdict, which is the argument. `lib/sealed-model.ts` is shared plumbing so the scripts exercise the production request path rather than a copy of it. |
| `src/lib/canonical.ts` (+ test) | ✅ | M7/S0.3, shared. Canonical serialization for the signed bytes, drafted with Claude Code under human direction. Safety-critical (determinism) — 16 unit tests, human-reviewed. Lives in `lib/` because `attest`, `seal` and `registry` must agree byte-for-byte (S2.7). |
| `src/evaluator/attest.ts` (+ test) | ✅ | M7/S0.3. Independent `verifyEnvelope` — signature recovery + fail-closed gate. Drafted with Claude Code; the decision to drop the unresolvable vendor package and verify with general-purpose crypto was made explicitly (spec-03 §1). The `encoding: canonical / utf8` field was added after a REAL 0G signature failed under canonical serialization — the AI diagnosed that `signer_mismatch` was masking a byte-framing bug, not a wrong key. 30 unit tests, incl. a real enclave signature as fixture. |
| `src/evaluator/attest-testkit.ts` | ✅ | M7/S0.3. Ephemeral-key signing helpers for the spike + tests. **Not a production path** — Overlap never signs anything. |
| `scripts/spike-attest.ts` | ✅ | M7/S0.3, the spike. **FULL GO (25 Jul):** PART A offline + PART B against live 0G, exit 0. Drafted with Claude Code; the AI traced the Router-vs-broker split (the Router pays with its own wallet, so it can never obtain a signature), read the signature route out of the 0G SDK without depending on it, resolved the broker URL and `teeSignerAddress` on-chain, and settled spec-03 §8.1 empirically. Human-directed and human-reviewed. |
| `scripts/og-wallet-status.ts` · `scripts/og-setup.ts` | ✅ | 0G operating-wallet diagnostics and one-time on-chain setup (ledger deposit + `acknowledgeProviderSigner`). Drafted with Claude Code. Safety-relevant and reviewed as such: `og:status` is read-only and never prints the private key (only the derived, public address); `og:setup` is **dry-run by default** and spends only with an explicit `--confirm`. The human executed and verified the mainnet transactions. |
| `src/components/web/**` · `src/app/create/**` · `src/app/room/**` | ✅ | M8 web screens: create (S3.1: `create-room-form`, `room-qr`; S3.5: `use-case-picker`), join landing, write+seal (S3.2: `seal-position-form`, `position-checklist`, `selfie-check-gate` + `submitCommitmentAction`), and verdict (S3.3: `countdown`, `verdict-panel`, `verdict-view`) + stories + RTL, and the routes/Server Actions wiring M1–M4. Drafted with Claude Code under human direction; human-reviewed. |
| `src/lib/room-bookmarks*.ts` · `src/components/web/{recent-rooms,remember-room}.tsx` (+ tests/stories) | ✅ | S3.9 "rooms on this device". Drafted with Claude Code under human direction. Two design calls were the AI's: **(1)** the store is a **port** (`RoomBookmarkStore`) that is **async from day one** even though `localStorage` is synchronous — the human asked for a future database to be possible, and async-later would have made it a rewrite of every caller instead of a new adapter; **(2)** `useCase` is deliberately **not** stored even though it is public metadata on the topic, because on a shared device a list reading "property sale, OTC trade" is an inference about a person that the topic does not make. Storage is treated as untrusted input (hand-editable) and every failure is swallowed — losing a bookmark must never be able to break the seal path. |
| `src/app/rooms/page.tsx` · `recent-rooms` search/filter | ✅ | S3.11. A `/rooms` list with search and a side filter. Drafted with Claude Code. The AI raised the blocking design problem rather than building around it: a list of UUIDs cannot be searched, so the feature needed something recognisable — which meant reopening S3.9's decision to store no `useCase`. The human chose the preset label (a closed set of three) over free text, and the AI implemented it so the label reaches the creator on a transient `?uc=` redirect and **never** in the shared join link. A pre-existing test asserting "no deal metadata" was rewritten rather than left passing, since it had started contradicting the live policy. |
| `src/components/web/site-header.tsx` (+ test/story) · `recent-rooms` `emptyState` | ✅ | S3.10 (header) and S3.12 (the Rooms link). Drafted with Claude Code. The AI made the call the backlog left open and argued it rather than picking the easier option: the link is **unconditional**, because a link that appeared only when this device has bookmarks would make the header itself disclose that someone here has negotiations open — on every page and in every screenshot — which is the S3.10 room-id rule one step out. A pre-existing test asserting the header contains no `/room/i` was rewritten: the real rule is no room *id*, and it had started forbidding a safe word. Verified in a real browser, since three bugs this weekend passed RTL and failed in the page. |
| `src/reveal/**` · `src/evaluator/og-signature.ts` (+ tests) | ✅ | S2.9, the reveal runner — the chain that turns a countdown into a verdict. Drafted with Claude Code under human direction. Safety-critical and reviewed as such: fail-closed is enforced in `runReveal` itself, and `buildVerdictMessage` **requires** an `attestationRef`, so there is no path in the type system from a failed attestation to a published verdict. Two calls were the AI's: **(1)** the unseal failure detail reports the error *type* only, never the message, because an AEAD failure string can carry fragments of the plaintext being decrypted — there is a test asserting a position never reaches the result; **(2)** `armReveal` was left **deliberately unwired** rather than forced, because the only meaningful scheduled transaction is a fourth topic message type that `decodeMirrorMessage` would reject, breaking every read — the AI raised this instead of shipping it and documented the reasoning in the backlog. 28 unit tests. |
| `src/reveal/in-flight.ts` · `verdict-view` poll rewrite (+ tests) | ✅ | S3.21, the concurrent-reveals fix — the P0 found on the topic (one room, three paid enclave calls, three verdict messages). Drafted with Claude Code under human direction. Both live mechanisms closed: the client poll re-arms via `setTimeout` only **after** the previous call returns (an interval fired again mid-reveal), and the server dedupes concurrent `revealRoom()` calls per room onto **the same promise**, dropped in `finally` so a failed reveal cannot wedge the room. The AI documented rather than hid the honest limitation: the lock is per-process, so multiple serverless instances can still race — closing that needs the topic to arbitrate, and Mirror's ~3 s indexing lag prevents it. 8 new tests. |
| `verdict-view` revealed-at (+ page/action wiring, tests, story) | ✅ | S3.22 — the resolved screen sat on "Reveal due · now" forever because `publishedAt` was read off the topic and discarded. Drafted with Claude Code. One call was the AI's: the publish time renders in **UTC deliberately**, not the viewer's locale — the string is server-rendered too, so a timezone-dependent format would hydrate differently than it rendered, and UTC matches the topic's own timestamps so the screen's claim can be checked against the public record. |
| `write/page.tsx` already-committed guard (+ page test) | ✅ | S3.23 — the write screen read only the expiry off the topic, so a returning user was offered a blank form, rewrote their whole position, passed the Selfie Check and sealed — and was rejected by the seat claim at the very last step. Drafted with Claude Code. The page now reads the commitments and shows "You already sent your position" + a link to the verdict instead of the form. Includes the repo's first server-page RTL test (registry/env mocked); one ordering call documented in a test: the "no deadline on the topic" guidance stays ahead of the commitment check, because a room with commitments but no readable expiry is Mirror lag and the clock message is the truthful one. |
| Submission video | ❌ | Human narration only (no AI voiceover — track rule). |

Legend: ✅ AI-assisted · ⬜ pending (fill when built) · ❌ not AI-assisted.
