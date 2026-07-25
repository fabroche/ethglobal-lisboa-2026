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
| S0.3 | **`spike-attest.ts`** | one sealed 0G call, verify signature **outside** the SDK (`verifyEnvelope`) | 0G | S0.2 | frank | 🟩 **FULL GO** — offline **+ live**, exit 0 |

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
| S2.2 | `evaluator` | 0G call, pinned model, temp 0, **enum output only**; prepends the use-case hint (RF-M6-007) | 0G | S1.4, S2.1 | **frank** | 🟩 **live-verified** (`npm run eval:live` GO) |
| S2.3 | `attest` (module) | verify TEE signature on every verdict, **fail closed** | 0G | S0.3 | | ⬜ |
| S2.4 | `scheduler` | arm + listen for the scheduled reveal | Hedera | S1.2 | dylan | 🟩 |
| S2.5 | `registry.read` | read verdict via Mirror Node REST | Hedera | S1.3 | dylan | 🟩 |
| S2.6 | topic versioning | 3 message types per session (expiry/commitments/verdict), versioned from commit 1 | Hedera | S1.3 | | ⬜ |
| S2.7 | canonical consolidation | migrate `registry` off its own serializer onto `src/lib/canonical.ts`; delete `src/registry/canonical.ts` | — | S1.4 | dylan | 🟩 |
| S2.8 | per-side gap consent → evaluator | **P0.** `c879e20` (per-side `gapOptIn` on the commitment message) + `ea0fc79` (`consentFromCommitments`: derive `consent: { a, b }` from BOTH commitments on the topic, missing/legacy ⇒ `false`, fail-safe) are on `develop`. Consent never comes from the create form (A's prefill only). Remaining: the caller that actually hands that `consent` to `evaluate()` — lands with S2.3, which owns the verdict write path. | 0G/Hedera | S2.2, S1.3 | dylan | 🟡 |
| S2.9 | reveal runner + validaciones | **P0 (para Frank — ver `docs/handoff-frank-validaciones.es.md`).** (a) Wire the reveal: scheduler fires → read both commitments → `evaluate()` (inputs ready on `develop`: `getSealedPayloads`, `consentFromCommitments`) → attest → publish verdict — today nothing writes a verdict. (b) Answer the 4 validations: HTTPS tunnel go/no-go · seal-key yes/no (§3.1) · 4.0-vs-v2 track call · `MEMORIA.md`. **Done (a):** `src/reveal/run-reveal.ts` (orchestrator, 17 tests incl. every fail-closed branch) + `src/evaluator/og-signature.ts` (fetch the broker signature → `Envelope`, 11 tests) + `buildVerdictMessage` + `registry.publishVerdict` + wiring in `verdict/actions.ts`. **Done (b):** all four answered in `docs/handoff-frank-validaciones.es.md`. ⚠️ **Left undone deliberately: `armReveal` is still not called at create.** `hederaScheduleService(buildRevealTx)` needs a transaction for Hedera to run at the deadline, and the only meaningful one is a topic message marking that the clock fired — a FOURTH message type, which `decodeMirrorMessage` would throw on, breaking every read. That belongs with **S2.6**, not a late edit. The reveal fires today on the server-side fallback over the publicly committed deadline (DA5), which is unmovable because the expiry is on the topic before anyone can write. | 0G/Hedera | S2.2, S2.8, S3.2 | **frank** | 🟩 |

## Phase 3 — Usable · Saturday evening
| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S3.1 | `web` create | screen: open a room, set deadline, get QR/link | web | S1.2 | dylan | 🟩 |
| S3.2 | `web` write+seal | screen: write position (preset placeholder + soft checklist, D16), seal in-browser | web | S1.4, S3.5 | dylan | 🟩 |
| S3.3 | `web` verdict | screen: countdown + one-line verdict (Mirror) | web | S2.5 | dylan | 🟩 |
| S3.4 | two-browser E2E | full flow across two browsers, QR to join. **Prereq: HTTPS origin** — phone browsers disable WebCrypto (IDKit bridge + our `seal()`) on plain-HTTP LAN; `APP_URL` must carry the HTTPS origin so QRs encode it (tunnel vs local TLS: pending team OK) | web | S3.1–S3.3 | | ⬜ |
| S3.5 | `usecases` presets | preset module (`src/session/usecases.ts`: labels/placeholder/checklist/evaluatorHint + Zod enum) + create-form use-case picker + `useCase` in the expiry message (D16) | web/Hedera | S3.1 | dylan | 🟩 |
| S3.6 | **`room-qr` demo fixes** | copy button fails **silently** in a non-secure context (`navigator.clipboard` is undefined off HTTPS/localhost), "Copied" never resets, no fallback, no `aria-live`; plus warn when the QR encodes a `localhost` URL — unscannable from a phone. **Found during demo rehearsal.** Touches M8 (dylan's lane) — reassigned with his agreement, he is on World. | web | S3.1 | **frank** | 🟩 |
| **S3.7** | **⛔ position field leaks to the browser** | **P0, BLOCKING S3.2's merge.** `seal-position-form.tsx`'s `<textarea name="position">` sets no `autoComplete`, `spellCheck`, `autoCorrect` or `autoCapitalize`, and the `<form>` sets none either. So the browser may **save the position to disk** (form history, keyed by the field name, offered as a suggestion later — even to the next person on that machine) and, with Chrome's *Enhanced spell check* or Edge's *Microsoft Editor* enabled, **send the text to Google/Microsoft**. Three lines above that field the UI promises *"sealed in this browser — the other side and the operator never see it"*. Same class of hole as D-M6-1 (receiving is already the breach) and earlier in the chain. Fix: `autoComplete="off"` + `spellCheck={false}` + `autoCorrect="off"` + `autoCapitalize="off"` + `data-1p-ignore` + `data-lpignore` on the textarea, `autoComplete="off"` on the form, drop/rename `name="position"`. **Trade-off to decide, not to skip:** `spellCheck={false}` removes the red underline — recommend telling the user why in the UI ("spellcheck is off on purpose: your text never leaves this browser"), which turns a limitation into evidence. | web | S3.2 | **dylan** | ⬜ **P0** |
| **S3.8** | **post-create navigation + both links** | After creating a room the QR renders from the create form's React state, so **a plain page reload destroys it** — no URL, no history, nothing to return to. Worse: `session.ts` builds `joinUrls` for **A and B** but `create/actions.ts:22` returns **only B**, so the creator is never shown their own `?side=A` link and cannot get back in to write their own position. Fix: `redirect()` to the existing `/room/[roomId]/share`, and show both links with distinct roles (yours = the way back in; theirs = the one to share). | web | S3.1 | **frank** | 🟩 |
| S3.11 | **rooms section: search + filter** | A dedicated `/rooms` with search and side/label filters; home keeps the 3 most recent + "see all". Needs something recognisable to search BY, so the bookmark gains the **preset label** (`property`/`job`/`otc`) — a closed set the user picked, not free text, so no figures or names can be typed in. **This reverses the S3.9 decision to exclude `useCase`**: consciously, since the user chose it and it is already public on the topic, but a list on a shared laptop now says what KIND of deal — so the UI warns and "forget" stays prominent. The label is passed via a transient `?uc=` on the creator's own redirect, never in the shared join link. | web | S3.9 | **frank** | 🟩 |
| **S3.12** | **reach `/rooms` from the navbar** | **Left undone in S3.11 — the route exists but is nearly unreachable.** Today the only path is the "See all N rooms →" link on the landing page, which renders **only when the list is truncated** (more than 3 rooms). With 1–3 rooms there is no way to reach `/rooms` at all except by typing the URL. Add a link in `site-header.tsx`. Two things to decide rather than assume: **(a)** whether it shows always or only when this device has rooms (an always-on "Rooms" link is a dead end for a first-time visitor, but conditional chrome means the header becomes a client component — it is a server component today, deliberately); **(b)** the word itself is safe ("Rooms" reveals nothing), but keep the S3.10 rule: **no room id, no count, no breadcrumb in the header** — it is the one element in every screenshot. **Decided:** (a) **unconditional** — a link that appears only when this device has rooms makes the header itself disclose that someone here has negotiations open, on every page and in every screenshot, which is the S3.10 rule one step out; it also keeps the header a server component. (b) No count, same reason. Consequence: an empty `/rooms` is now reachable, so `RecentRooms` gained an optional `emptyState` that renders only after the store answers. | web | S3.11 | **frank** | 🟩 |
| S3.10 | **navbar** | No page has a link home — all five are dead ends once you leave the landing. Adds a minimal header in `layout.tsx` (wordmark → `/`) plus the **theme toggle**: `ThemeProvider` is configured with `enableSystem` but no UI exists to change it, so dark mode is currently unreachable by choice. **Note for S3.7/S3.2 (dylan):** a persistent link home makes it one click to leave the write screen and lose an unsealed position, which by design is stored nowhere — worth an unsaved-changes guard on that form. | web | S3.1 | **frank** | 🟩 |
| S3.9 | **recent rooms (bookmarks)** | No accounts, so a closed tab means a lost room unless the URL was saved. Remember rooms **client-side** behind a **swappable port** (`RoomBookmarkStore`, async from day one) so a future server/DB implementation is a new adapter, not a refactor. Stores `{ roomId, side, savedAt }` only — **never anything derived from a position**, never `useCase` (it would reveal the deal *type* on a shared device). Includes "forget" and a TTL. | web | S3.8 | **frank** | 🟩 |
| S3.13 | **worldid 4.0 + Selfie Check** (was claimed as `S3.6`; that id was already frank's room-qr item, claimed 16:57 vs 17:43 — renumbered, content untouched) | migrate M3 to World ID 4.0: IDKit 4.x, server-signed `rp_context` (`WORLD_SIGNING_KEY`), `selfieCheckLegacy` preset, verify via `POST /api/v4/verify/{rp_id}` (plain HTTP — drops the SDK from the server path). Selfie Check is 4.x-only; v2 `device` flow is the fallback if timeboxed out. See `transversal/integration-worldid.md` §5. | World | S3.2 | dylan | 🟡 |

## Phase 4 — Demo & track requirements · Saturday late
| ID | Component | What | Sponsor | Depends on | Owner | Status |
|----|-----------|------|---------|-----------|-------|:------:|
| S4.1 | `inspect.ts` | demo: show our store holds only ciphertext (no key) | demo | S1.3 | dylan | 🟩 |
| S4.2 | `demo-naive.ts` | demo: same product w/o enclave → plaintext leaks | demo | S2.2 | **frank** | 🟩 (`--live` shows the SAME verdict) |
| S4.3 | World testing doc | developer friction + user friction (track requirement) | World | S1.5 | dylan | 🟡 (dev half + skeleton; user half after S3.2) |
| S4.4 | README (final) | what/why, architecture, how to run, sponsors | compliance | — | | ⬜ |
| S4.5 | `ai-usage.md` | which files were AI-assisted (keep updated all weekend) | compliance | — | | ⬜ |
| S4.6 | output vocabulary | enum verdicts + opt-in `gap:*` consent logic | 0G/web | S2.2 | | ⬜ |
| S4.7 | repo hygiene sweep | pre-freeze: decide `MEMORIA.md` (pre-pivot, ES — D2; owner's call) · confirm no editor-history/temp paths tracked (`.history/` incident, fixed) · drop stale local drafts or fold them in (`README2.md` → S4.4) · final `.gitignore` re-check | compliance | — | **frank** | 🟡 |
| S4.8 | brand — apply Overlap | per DA11 (confirm w/ Frank first): **tokens** → `globals.css` (integrator) from design-system §Brand — Overlap (indigo `--primary` + `--side-a`/`--side-b`/`--seam` + semantic `--workable`/`--not-workable`/`--pending`); **`<OverlapMark>`** logo component (chevron SVG) + `overlap` wordmark; migrate `verdict-panel` off placeholder Tailwind colours onto the tokens; **rename** Seam→Overlap (README/docs, UI copy, `roomActionId` prefix `seam-`→`overlap-`, World app display name) | web/compliance | DA11 | dylan | ⬜ |

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

**⛔ `S2.8` is P0 and blocks the next merge to `develop`.** It is the difference between a consent
guarantee we can demonstrate and one we only describe. A judge asking *"where does the other party
agree to this?"* is a question we should want, not fear — and right now the honest answer is that they
don't, because one person ticks a box for both. `c879e20` on `develop-dylan` already does the schema
half; what is missing is reading both commitments and passing `{ a, b }` into `evaluate()`.

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
