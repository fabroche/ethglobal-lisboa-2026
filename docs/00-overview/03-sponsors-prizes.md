# 03 · Sponsors & prizes

Status: 🟧 draft · Last updated: 2026-07-24

The star document of the hackathon. Overlap targets **three partner tracks — the maximum allowed per
project** — and every one is **load-bearing** (remove it and the product breaks).

## Targeted tracks

| Track | Pool | Places | Fit |
|-------|------|:------:|-----|
| **0G — Best AI Product** | **$6,000** *(approx — confirm at booth)* | 3 | End-user product; sealed inference **is** the product; used for *inference* (not a numeric compare). |
| **World — Selfie Check Beta** | **$3,500** *(approx — confirm at booth)* | 2 | Abuse prevention, **not login**: one seat per room per side. |
| **Hedera — No Solidity Allowed** | **$3,000** *(approx — confirm at booth)* | 3 | Three native services (HCS · Schedule · Mirror), **zero Solidity**. |

**≈ $12,500 addressable, 8 winning positions.** We are at exactly 3 partner slots, so there is no room
for error. Prize amounts are approximate — **re-read the sponsor pages before submitting** (they changed
once mid-event).

## The removal test — take one out, name what breaks

| Sponsor | Role | Remove it and… |
|---------|------|----------------|
| **0G** | Sealed inference — the referee | **There is no product.** Two paragraphs can't be compared arithmetically, and a model that reads both sides is exactly what neither party will let an ordinary company run. |
| **Hedera** | Commitments + the clock | Either side can claim afterwards they'd have said something different, **and** the opening lives on a server *we* control — so we can be pressured to hold it. |
| **World** | One seat per side | One round of probing breaks the seal: twenty sessions with slightly varied positions reconstruct the other side's number. The enclave protects each answer perfectly and the system still loses. |

Hedera appears **three times** in the flow: it sets the clock, locks the papers, and opens the room.

## What we are NOT reaching for

Hedera's **agentic-payments** track is a bigger pool (~$6,000) but requires an actual **payment or token
transfer** on testnet. **Overlap moves no money.** Do **not** bolt a payment on to reach for it — it would
be a contrived addition that weakens the story and risks the no-money-needed clarity of the design.

## Workshop questions to confirm (Friday)

**0G — 14:30, Workshop Room**
- Can we **constrain what the model emits** (structured output / enum)?
- Is the attestation **verifiable outside your SDK**, and what exactly does the signature cover — **does
  it include the input**?
- The submission form asks for **contract deployment addresses**. What if the product has **no contract**?
  *(If mandatory, we need something on 0G Chain — a design decision. Tracked as DA3 in `05-open-decisions.md`.)*
- Confirm the exact **attestation package/endpoint** and the shape `verifyEnvelope` expects.

**World — 16:30**
- Can a Selfie Check nullifier be **scoped per session/room** rather than per app?
- What must the **testing documentation** contain to qualify (developer friction + user friction)?

**Hedera — 17:00**
- Confirm **HCS + Schedule Service + Mirror Node** counts as **three native services** for No Solidity.
- **Scheduled-transaction** expiry semantics — what happens if a required signature **never arrives**?

## Compliance reminders (disqualifiers)

- **Commit every 30 minutes** from hour one, even when ugly. Large single commits or missing history can
  disqualify.
- **AI attribution is mandatory** — see `../ai-usage.md`. Spec-driven workflow ⇒ commit the specs
  (`../spec-01-session.md`, `../spec-02-evaluator.md`, `../spec-03-attest.md`) **before** the code.
- **Video** 2:30 target, 720p minimum, **no AI voiceover** (auto-reject).
- **World track requires a testing doc** — start it Saturday morning while the friction is fresh.
