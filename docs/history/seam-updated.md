# Overlap

Sealed two-party negotiation. Two sides write their terms in plain language; a
model inside sealed hardware reads both and returns one line — whether a deal is
possible — without either side, or us, ever seeing the other's terms.

**ETHGlobal Lisbon 2026.** Submission deadline: Sunday 26 July, 09:00 WEST.

---

## The idea in three sentences

Two people need to agree on terms and neither wants to name theirs first (a
candidate and a company). Each writes their position into a sealed session;
neither sees the other's, and neither do we, because the comparison runs inside
a TEE that no one — including the operator — can look into. The verdict is one
line: `workable` or `not_workable`, optionally with whether one issue or
several block (never which) if both sides opted in.

Why it can't be built normally: a plain server would see both positions, so no
counterparty would trust it. The sealed enclave is the whole reason this is
usable, not a feature bolted on.

Why there's an AI: a real offer is six dimensions that trade off (salary, remote
days, start date, title, notice, equity). Deciding if two messy positions fit is
a judgement, not a numeric comparison — and it satisfies 0G's requirement that
0G Compute be used for *inference*.

## How it works

```
Side A opens a room        → deadline published to Hedera before anyone writes
Both sides write + seal    → encrypted in-browser to the enclave key
One seat per side          → World Selfie Check, one nullifier per room per side
Commitments locked         → sha256(ciphertext) + timestamp to an HCS topic
Sealed evaluation          → pinned model, temp 0, inside 0G TeeML enclave
Attestation verified       → fails closed: bad signature ⇒ no verdict published
Scheduled reveal fires     → verdict written to topic, both read via Mirror Node
```

## Why each sponsor is load-bearing

- **0G** — sealed inference. Remove it and there is no product: a model that
  reads both sides is exactly what neither party will let an ordinary operator
  run.
- **Hedera** — locks both commitments (nobody can claim they'd have said
  something else) and holds the deadline (a clock we don't control, so we can't
  be pressured to delay it). Three native services: HCS, Schedule Service,
  Mirror Node.
- **World** — one seat per side. Without it, twenty probing submissions
  reconstruct the other side's number. Selfie Check as an abuse signal, not a
  login.

## Prizes targeted (3 partner slots — the max)

| Track | Pool | Places |
|---|---|---|
| 0G — Best AI Product | $6,000 | 3 |
| World — Selfie Check Beta | $3,500 | 2 |
| Hedera — No Solidity Allowed | $3,000 | 3 |

---

## Architecture

Nine modules, no database, no smart contract. Four are reused, five are ours.

| Module | Does | Owner |
|---|---|---|
| `graph` — n/a | not used in Overlap | — |
| `session` | create room, publish deadline, issue link | us |
| `seal` (client) | encrypt position in-browser to enclave key | us |
| `worldid` | Selfie Check, one nullifier per room per side | reuse + us |
| `registry` | write/read commitments + verdict on HCS topic | us |
| `scheduler` | arm and listen for the scheduled reveal | reuse |
| `evaluator` | 0G call, pinned model, constrained output | us |
| `attest` | verify the TEE signature independently | us |
| `web` | three screens: create, write+seal, verdict | us |

Storage is the HCS topic. The topic carries three message types per session
(expiry, two commitments, verdict) — **version them from the first commit.**

## The two hard parts (everything else is plumbing)

1. **`attest`** — verifying the attestation signature *outside* the 0G SDK, not
   just receiving it. This is the Friday-night spike. If it doesn't hold, the
   core claim collapses and we need to know tonight. 0G providers expose an
   attestation download endpoint and sign every response with an in-enclave key;
   there's a `verifyEnvelope` helper in `@foundryprotocol/0gkit-attestation`.
2. **`seal` canonical + commitment** — the commitment must match what the
   verifier recomputes. Deterministic serialisation, hash the ciphertext, don't
   let a timestamp sneak into the committed bytes.

## Output vocabulary (a deliberate constraint)

The enclave never emits free text — free text leaks ("the gap is the start
date" tells the other side something). It picks from an enum:

- Always: `workable` | `not_workable`
- Only if both opted in: `gap:compensation` | `gap:timing` | `gap:scope`

Emit the richest verdict *both* sides consented to.

## Config

```
# 0G
OG_ROUTER_URL=https://router-api.0g.ai/v1
OG_KEY=
OG_MODEL=            # pin an exact model, record its hash
OG_ENCLAVE_PUBKEY=   # for independent attestation check

# Hedera
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HEDERA_TOPIC_ID=     # created once, printed here

# World
WORLD_APP_ID=
WORLD_ACTION=        # scoped per room at runtime
```

## Repo layout

```
seam/
├─ docs/
│  ├─ spec-01-session.md      ← commit specs BEFORE code (required by rules)
│  ├─ spec-02-evaluator.md
│  ├─ spec-03-attest.md
│  └─ ai-usage.md             ← which files were AI-assisted
├─ src/
│  ├─ session/
│  ├─ seal/
│  ├─ worldid/
│  ├─ registry/{write,read}.ts
│  ├─ scheduler/
│  ├─ evaluator/{og,attest}.ts
│  └─ web/                    ← create · write+seal · verdict
├─ scripts/
│  ├─ spike-attest.ts         ← Friday night, first thing that runs
│  ├─ inspect.ts              ← demo: show the ciphertext in our own store
│  └─ demo-naive.ts           ← demo: same product, no enclave, plaintext leaks
└─ README.md
```

## Build order — each row is independently demoable

| When | Ship | Proves |
|---|---|---|
| **Fri night** | `spike-attest.ts` — one sealed call, signature verified | the project is possible at all |
| Sat AM | session create + client seal + HCS commitments | both sides can lock in |
| Sat PM | evaluator with constrained output, verdict to topic | the core loop closes |
| Sat eve | three-screen web UI, two-browser end-to-end, QR to join | someone can use it |
| Sat late | `inspect.ts` + `demo-naive.ts`, World testing doc, README | demo + track reqs |
| **Sat 22:00** | **feature freeze — record the video** | we submit |
| Sun 07:00 | submit, two hours early | done |

**Suggested split:** one of us owns 0G (`seal`, `evaluator`, `attest`), the
other owns Hedera (`session`, `registry`, `scheduler`) + World + its testing doc.

## The demo (3 min, two laptops)

Not "watch it work" — two text boxes and one line look identical whether the
comparison ran in an enclave or a `console.log`. Instead:

1. **Run a real session** with two judges. Let it come back `not_workable`.
2. **Open our own store** live (`inspect.ts`) — it's ciphertext, we hold no key.
3. **Break it** (`demo-naive.ts`) — same product without the enclave, both
   positions in the clear. This is why nobody has built it.
4. **Fail the attestation** — tamper one byte, no verdict published. The check
   is real.
5. **Close on the public receipt** — commitments timestamped before the reveal,
   no figures anywhere.

Acts 2–3 are the demo. Act 1 is setup, Act 4 is the seal.

## Rules that disqualify people every weekend

- **Commit every 30 min from hour one**, even ugly. Single giant commits or
  missing history can disqualify.
- **AI attribution is mandatory.** Document which files were AI-assisted in
  `docs/ai-usage.md`. Spec-driven workflow ⇒ commit the specs and prompts, not
  in chat history.
- **Video 2:30 target.** ETHGlobal rejects <2:00, 0G wants <3:00. 720p min. No
  AI voiceover — auto-reject.
- **World tracks need testing docs** — developer friction *and* user friction.
  Start Saturday morning while the friction is fresh.
- **Re-read sponsor pages before submitting** — they changed once mid-event.

## Open questions for the workshops (Friday PM)

- **0G (14:30):** structured/enum output? attestation verifiable outside the
  SDK, and does the signature cover the input? Are contract deployment addresses
  mandatory for a product with no contract?
- **World (16:30):** nullifier scoped per session, not per app? what must the
  testing doc contain?
- **Hedera (17:00):** does HCS + Schedule + Mirror Node count as three native
  services? scheduled-tx behaviour if a required signature never arrives?
