# Backlog — Seam

> Pull-based. Finish a component, claim the next. Ordered by the build plan and by
> dependencies. This file is the single source of truth for who is on what.

## How to claim an item

1. Pick the **top unclaimed** item whose dependencies are `🟩 done`.
2. Set its **Status → 🟡 wip** and **Owner → your name** (`frank` / `dylan`), and
   **commit that change first** (`chore(backlog): claim S2.2`) before writing code.
   The commit is what reserves it — if you didn't commit the claim, it's not yours.
3. **WIP limit = 1 per person.** Don't claim a second item until yours is `🟩 done` (merged to `develop`).
4. Don't claim an item another person is already `🟡 wip` on.
5. When merged to `develop`, set **Status → 🟩 done**.

**Legend:** ⬜ todo · 🟡 wip · 🟩 done · ⛔ blocked
**Initial lean** (not a rule, just to reduce context-switching): 0G items → `frank`, Hedera/World items → `dylan`. Anyone can pull anything.

---

## Phase 0 — Foundations & the gamble · Friday night
> The Friday spike is the whole bet. If `attest` can't be verified independently, we know tonight.

| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S0.1 | repo setup | branches, `.env.example`, README skeleton, spec folder | — | — | integrator | 🟩 |
| S0.2 | `spec-03-attest.md` | spec for independent attestation check (before code) | 0G | S0.1 | frank | 🟩 |
| S0.3 | **`spike-attest.ts`** | one sealed 0G call, verify signature **outside** the SDK (`verifyEnvelope`) | 0G | S0.2 | frank | 🟩 offline · ⛔ live needs `OG_KEY` |

## Phase 1 — Lock-in · Saturday AM
| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S1.1 | `spec-01-session.md` | spec for room + deadline + commitments | Hedera | S0.1 | | ⬜ |
| S1.2 | `session` | create room, publish expiry to HCS **before** any write, issue link | Hedera | S1.1 | dylan | 🟩 |
| S1.3 | `registry.write` | `sha256(ciphertext)` + timestamp to HCS topic (versioned messages) | Hedera | S1.1 | dylan | 🟩 |
| S1.4 | `seal` (client) | encrypt position in-browser to enclave pubkey (hybrid) | 0G | S0.3 | frank | 🟩 |
| S1.5 | `worldid` | Selfie Check, one nullifier per room per side | World | S0.1 | dylan | 🟩 |

## Phase 2 — Core loop closes · Saturday PM
| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S2.1 | `spec-02-evaluator.md` | spec for sealed evaluation + constrained output (incl. `useCase` prompt hint, D16) | 0G | S0.1 | | ⬜ |
| S2.2 | `evaluator` | 0G call, pinned model, temp 0, **enum output only**; prepends the use-case hint (RF-M6-007) | 0G | S1.4, S2.1 | | ⬜ |
| S2.3 | `attest` (module) | verify TEE signature on every verdict, **fail closed** | 0G | S0.3 | | ⬜ |
| S2.4 | `scheduler` | arm + listen for the scheduled reveal | Hedera | S1.2 | dylan | 🟩 |
| S2.5 | `registry.read` | read verdict via Mirror Node REST | Hedera | S1.3 | dylan | 🟩 |
| S2.6 | topic versioning | 3 message types per session (expiry/commitments/verdict), versioned from commit 1 | Hedera | S1.3 | | ⬜ |
| S2.7 | canonical consolidation | migrate `registry` off its own serializer onto `src/lib/canonical.ts`; delete `src/registry/canonical.ts` | — | S1.4 | dylan | 🟩 |
| S2.8 | per-side gap consent → evaluator | **P0 (Frank).** Land `c879e20` (per-side `gapOptIn` on the commitment message) on `develop` + provide the wiring: derive `consent: { a, b }` from BOTH commitments on the topic (missing/legacy ⇒ `false`, fail-safe) for `evaluate()`. Consent never comes from the create form (A's prefill only). | 0G/Hedera | S2.2, S1.3 | dylan | 🟩 |

## Phase 3 — Usable · Saturday evening
| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S3.1 | `web` create | screen: open a room, set deadline, get QR/link | web | S1.2 | dylan | 🟩 |
| S3.2 | `web` write+seal | screen: write position (preset placeholder + soft checklist, D16), seal in-browser | web | S1.4, S3.5 | dylan | 🟩 |
| S3.3 | `web` verdict | screen: countdown + one-line verdict (Mirror) | web | S2.5 | dylan | 🟩 |
| S3.4 | two-browser E2E | full flow across two browsers, QR to join. **Prereq: HTTPS origin** — phone browsers disable WebCrypto (IDKit bridge + our `seal()`) on plain-HTTP LAN; `APP_URL` must carry the HTTPS origin so QRs encode it (tunnel vs local TLS: pending team OK) | web | S3.1–S3.3 | | ⬜ |
| S3.5 | `usecases` presets | preset module (`src/session/usecases.ts`: labels/placeholder/checklist/evaluatorHint + Zod enum) + create-form use-case picker + `useCase` in the expiry message (D16) | web/Hedera | S3.1 | dylan | 🟩 |
| S3.6 | worldid 4.0 + Selfie Check | migrate M3 to World ID 4.0: IDKit 4.x, server-signed `rp_context` (`WORLD_SIGNING_KEY`), `selfieCheckLegacy` preset, verify via `POST /api/v4/verify/{rp_id}` (plain HTTP — drops the SDK from the server path). Selfie Check is 4.x-only; v2 `device` flow is the fallback if timeboxed out. See `transversal/integration-worldid.md` §5. | World | S3.2 | dylan | 🟡 |

## Phase 4 — Demo & track requirements · Saturday late
| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S4.1 | `inspect.ts` | demo: show our store holds only ciphertext (no key) | demo | S1.3 | dylan | 🟩 |
| S4.2 | `demo-naive.ts` | demo: same product w/o enclave → plaintext leaks | demo | S2.2 | | ⬜ |
| S4.3 | World testing doc | developer friction + user friction (track requirement) | World | S1.5 | dylan | 🟡 (dev half + skeleton; user half after S3.2) |
| S4.4 | README (final) | what/why, architecture, how to run, sponsors | compliance | — | | ⬜ |
| S4.5 | `ai-usage.md` | which files were AI-assisted (keep updated all weekend) | compliance | — | | ⬜ |
| S4.6 | output vocabulary | enum verdicts + opt-in `gap:*` consent logic | 0G/web | S2.2 | | ⬜ |
| S4.7 | repo hygiene sweep | pre-freeze: decide `MEMORIA.md` (pre-pivot, ES — D2; owner's call) · confirm no editor-history/temp paths tracked (`.history/` incident, fixed) · drop stale local drafts or fold them in (`README2.md` → S4.4) · final `.gitignore` re-check | compliance | — | | ⬜ |

## Phase 5 — Submit · Saturday 22:00 → Sunday 07:00
| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S5.1 | video | record 2:30, 720p+, no AI voiceover, feature freeze first | compliance | all | | ⬜ |
| S5.2 | submit | re-read sponsor pages, submit ~2h early | integrator | S5.1 | | ⬜ |

---

## Critical path
`S0.2 → S0.3 (spike)` gates everything on 0G. In parallel, Hedera side can start `S1.1 → S1.2/S1.3`
without waiting. The core loop (`S2.2` + `S2.3` + `S2.5`) is the "it works" milestone; the web UI and
the two demo scripts (`S4.1`, `S4.2`) are what actually win the room.

---

## Definition of Done (every item)

An item is `🟩 done` only when ALL of these hold. **This is the merge gate** — same discipline as our
previous project (test + story + document, every time).

**Tests** (see `docs/transversal/quality-and-testing.md`)
- Non-trivial component → implementation + **RTL test (Vitest)**, co-located.
- Module logic (seal/commitment **determinism**, registry parsing, `attest` verify) → **unit tests**.
- Critical flow → **Playwright E2E** (the two-browser session).
- Mock 0G/Hedera/World in unit tests; use real services in E2E where feasible.

**Stories**
- Non-trivial UI component → a **Storybook story** (variants/states), co-located.

**Docs — document after each item (do NOT skip this)**
- Update the item's **module doc** (`docs/modules/Mx-*.md`): tick its RF/RNF, record any decision made.
- Update **`CLAUDE.md`** status if the item changes how the system works.
- Log AI-assisted files in **`docs/ai-usage.md`**.
- The spec (`docs/spec-*.md`) was committed **before** the code (spec-driven rule).

**Green + safe**
- `typecheck` + `lint` + `test` + `build` all pass.
- Guardrails respected: no free text from the enclave, **fail closed**, no user private keys, no secrets committed.

Then: set Status → 🟩 `done`, open a PR to `develop` (**no squash**), the integrator reviews and merges.
A component isn't "done" because it runs — it's done when it's **tested, story'd, documented, and green**.
