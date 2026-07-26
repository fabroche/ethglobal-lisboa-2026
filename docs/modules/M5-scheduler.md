# M5 · `scheduler`

> The deadline clock — a timer neither party owns. Arm the Hedera scheduled reveal before any work,
> then listen for it to fire.

| Field | Value |
|-------|-------|
| **ID** | M5 |
| **Status** | 🟡 wip (S2.4 — arm/fire logic landed) |
| **Backlog** | S2.4 |
| **Sponsor** | Hedera |
| **Depends on** | M1 (`session` — arms the reveal at room creation) |
| **Used by** | M6 (`evaluator` — the reveal firing triggers sealed evaluation) |

## 1. Purpose & scope
Use Hedera **Schedule Service** to arm a **scheduled reveal** at the room's deadline and to detect
when it fires. The clock is enforced by something **neither party owns** (D6), so the opener can't be
pressured to hold the deadline. **Arm-before-work:** the scheduled transaction is created at room
creation, before any commitment. **Out of scope:** setting the deadline value (M1), running the
evaluation (M6).

## 2. Actors
Our server (creates the scheduled tx with **our** Hedera account, D8) · Hedera Schedule Service ·
Hedera HCS (the reveal drives the verdict write via M4/M6).

## 3. Functional requirements (RF)
| ID | Requirement | Priority |
|----|-------------|:--------:|
| RF-M5-001 | Create a **scheduled transaction** for the reveal at the room deadline (arm-before-work) | Must |
| RF-M5-002 | Detect when the scheduled reveal **fires** | Must |
| RF-M5-003 | On firing, trigger the sealed evaluation (M6) | Must |
| RF-M5-004 | Do not allow the reveal to be brought forward or delayed by either party | Must |

## 4. Non-functional requirements (RNF)
| ID | Requirement | Metric / criterion |
|----|-------------|--------------------|
| RNF-M5-001 | **Clock independence** | Neither side nor the operator can move the reveal time |
| RNF-M5-002 | Arm before work | The scheduled tx exists before any commitment is written |

## 5. Data touched
No new message type of its own; the reveal firing leads to the **verdict entry** (M4). See
`00-overview/02-data-model.md`.

## 6. Architecture / layer fit
`src/scheduler/` wraps Hedera Schedule Service. Called by M1 at room creation to arm; polled/subscribed
to detect firing; on fire, invokes M6 → M7 → M4.

## 7. Functionalities

### F-M5-1 · Arm and listen for the reveal
| Field | Value |
|-------|-------|
| **ID** | F-M5-1 · **Status** 🟧 |

**Flow / activity:**
```mermaid
flowchart TD
  A([Room created]) --> B[Create scheduled tx @ deadline]
  B --> C{Deadline reached?}
  C -- No --> C
  C -- Yes --> D[Reveal fires]
  D --> E[Trigger evaluator M6]
```
**Acceptance criteria:**
- [x] The scheduled tx is armed at room creation, before any commitment. _(armReveal, future-only; wired by M1/web)_
- [x] When the deadline is reached, evaluation is triggered exactly once. _(onRevealFired idempotent — unit-tested)_

### Implementation notes (S2.4 — arm/fire logic)
Landed in `src/scheduler/` with co-located Vitest tests:
- `service.ts` — the `ScheduleService` port (`arm`, `status`).
- `reveal.ts` — `armReveal` (validates a **future** deadline via `@/session` `assertFutureDeadline`,
  then arms), `onRevealFired` (idempotent trigger ⇒ evaluation fires **exactly once**, RF-M5-003),
  `isDeadlineReached` (the **DA5 fallback** server-side timer that still honours the committed deadline).
- `hedera-schedule.ts` — the only file importing the SDK, `server-only`. Uses a long-term scheduled
  transaction (`expirationTime = deadline`, `waitForExpiry(true)`) so Hedera enforces the reveal time
  (RNF-M5-001). The transaction that fires (the verdict write) is **injected** once M6/M7 exist.

**Deferred:** wiring `armReveal` into `session.createRoom`/the web create flow, and supplying the real
reveal transaction (needs M6/M7). **Open decision DA5** (scheduled-tx signature never arrives) is
confirmed at the Hedera booth; `isDeadlineReached` is the committed fallback. Real adapter covered by
E2E/manual (no live calls in units).

### The lazy reveal, in plain words (S2.10)

There is **no alarm clock** in Overlap. Nothing wakes up at the deadline to run the evaluation —
there is no worker and no database (D4), and on serverless hosting there is no always-on process to
be woken. Instead, **the first person to look at the clock after the deadline is the one who turns
the lights on** — and everyone who looks after them finds the lights already on.

Concretely: when someone opens the verdict screen, the screen asks the server "is there a verdict
yet?". If the publicly committed deadline has passed and there is none, **that read triggers the
reveal** (unseal → enclave → attest → publish). Every later reader just finds the verdict on the
topic and reads it.

Why this is safe, in three facts:

1. **The deadline is public before anyone writes** (RNF-M1-001). It is on the topic, so no reader's
   opinion of "now" matters — the server only honours the committed clock, never a client's.
2. **First-writer-wins.** The topic is the durable truth: `runReveal` refuses when a verdict is
   already there, so N simultaneous readers produce one verdict and N−1 get `already_published`.
   (Within one server process, concurrent readers don't even race — they join the same in-flight
   reveal and share its result, S3.21.)
3. **Nobody special is needed.** Either side, or any observer with the link, can be "the first
   reader" — the trigger carries no authority, because everything the reveal does is checked
   (attestation verified, fail closed) regardless of who tripped it.

**One line for the demo narration:** *"There's no alarm clock — the first person to check after the
deadline is the one who flips the switch; everyone else walks into a lit room."*

## 8. Endpoints / Server Actions / Integrations / Jobs
| Type | Name | Input | Output | Auth | Notes |
|------|------|-------|--------|------|-------|
| Integration | `armReveal` | `{ roomId, deadlineIso }` | scheduleId | our key | Hedera Schedule Service |
| Job | `onRevealFired` | scheduleId | triggers M6 | our key | idempotent trigger |

## 9. UI components (Definition of Done)
| Component | Story | RTL test | Status |
|-----------|:-----:|:--------:|--------|
| _(no direct UI — countdown lives in M8)_ | — | — | 🟧 |

## 10. Module acceptance criteria
- [ ] The reveal cannot be moved by either party (RNF-M5-001).
- [ ] Evaluation triggers once, on time, when the reveal fires.

## 11. Module closure DoD
_See `_templates/module.md` §11._

## 12. Risks & open decisions
- **What happens if a required scheduled-tx signature never arrives?** Open decision — confirm expiry
  semantics at the **Hedera booth** (see `00-overview/05-open-decisions.md`). Fallback: server-side
  timer that still honours the publicly committed deadline.
