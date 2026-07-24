# Seam — project brief

**ETHGlobal Lisbon 2026 · submission deadline Sunday 26 July, 09:00 WEST**

Read time ~6 minutes. This is everything you need to be up to speed.

---

## 1. What it is, in one paragraph

Two parties need to agree on terms and neither wants to name theirs first — a candidate and a company, a buyer and a seller. Each writes their position in plain language into a sealed session. Neither sees the other's. A model running inside sealed hardware reads both and returns **one line to both sides**: whether a workable deal exists. Nothing else comes out — not where the room is, not who was further off, not either position.

Think of a referee locked in a windowless room. You both slide a paper under the door. The referee says "yes" or "no" through the door. Then the papers burn.

## 2. Why this doesn't already exist

Anyone could code this in an afternoon as a normal web app: a server takes both positions and promises not to look. Nobody would use it. The operator is the one party with an incentive to look, and no recruiter is putting their ceiling into a stranger's database that also talks to the candidate.

Three things had to become true at once for this to be buildable:

1. The comparison has to be invisible **to the operator too**, and provably so.
2. The deadline has to be enforced by something neither party owns.
3. Both submissions must be provably locked before the reveal, so nobody can claim afterwards they'd have said something different.

That's the whole reason there are three sponsors here rather than one.

## 3. Why there's an AI in it

An earlier version used a single number and a comparison. That's too small to be true — a real offer is salary, equity, remote days, start date, title, notice period, and they trade against each other. Deciding whether two messy positions can fit is a **judgement**, not an inequality. Only something that sees both sides at once can make it — which is exactly what no ordinary operator can be trusted to do.

This also matters for qualification: 0G's product track requires proof you used 0G Compute for **inference**. A numeric comparison inside a TEE is not inference and would likely be ruled out.

## 4. User flow

0. **Side A opens a room.** Sets the deadline, gets a link. The expiry is published to Hedera *before anyone writes anything*, so side B sees the terms of the clock before committing a word. This is what stops the opener from using the deadline as leverage.
1. **Both sides write a position** in plain language. Encrypted in the browser to the enclave's key — your server never holds a decryptable copy.
2. **One seat per side.** Selfie Check issues one nullifier per room per side.
3. **Commitments locked.** A hash of each ciphertext goes to the consensus topic with a timestamp.
4. **The sealed room.** Inside the enclave, both positions are decrypted for the first and only time. A pinned model at temperature 0 judges compatibility.
5. **The clock fires.** The scheduled transaction executes on time regardless of who wants what.
6. **One verdict to both sides**, drawn from a fixed vocabulary.

## 5. Output vocabulary — a deliberate design decision

A model handed both positions will happily write a paragraph, and that paragraph leaks. "The gap is the start date" tells the other side something they didn't have. So the enclave is not allowed to emit free text.

- **Always:** `workable` / `not_workable`
- **Only if both sides opted in beforehand:** the binding dimension — `gap: compensation`, `gap: timing`, `gap: scope`

The enclave emits the richest verdict *both* parties consented to. If one side wants the bare answer, everyone gets the bare answer.

## 6. Technical flow

```
ScheduleCreateTransaction          expiry written to HCS before any submission
  ↓
Client A / Client B: seal(position)  hybrid encrypt to enclave key, browser side
  ↓
World ID Selfie Check              one nullifier per room, per side
  ↓
TopicMessageSubmitTransaction      sha256(ciphertext) + consensus timestamp
  ↓
POST router-api.0g.ai/v1           pinned model hash, temperature 0
  ↓
constrained output schema          enum verdict, never free text
  ↓
verifyAttestation(sig, enclaveKey) fails closed — no verdict published on failure
  ↓
scheduled tx fires → verdict to topic → both clients read via Mirror Node REST
```

Four decisions in there that aren't plumbing:

- **Nullifier scope.** Scope it to the room, not the app. App-wide means a person can use Seam exactly once ever. Per-room means they can negotiate many times but submit once per room.
- **Constrained output.** Enum in, enum out. This is the leak control.
- **Fail closed.** A verdict published without a valid attestation looks identical to a good one, which is worse than no verdict.
- **Message versioning.** The topic carries three message types over a session (expiry, commitments, verdict). Version them from the first commit.

## 7. Why each sponsor is load-bearing

The test is removal — take one out, name what breaks.

| Sponsor | Role | Remove it and… |
|---|---|---|
| **0G** | Sealed inference — the referee | There is no product. Two paragraphs can't be compared arithmetically, and a model that reads both sides is exactly what neither party will let an ordinary company run. |
| **Hedera** | Commitments + the clock | Either side can claim afterwards they'd have said something different, and the opening lives on a server *we* control — which means we can be pressured to hold it. |
| **World** | One seat per side | One round of probing breaks the seal. Twenty sessions with slightly varied positions reconstructs the other side's number. The enclave protects each answer perfectly and the system still loses. |

Hedera appears three times in the flow: sets the clock, locks the papers, opens the room.

## 8. Prizes we're targeting

| Track | Pool | Places | Fit |
|---|---|---|---|
| 0G — Best AI Product | $6,000 | 3 | End-user product, sealed inference is the product |
| World — Selfie Check Beta | $3,500 | 2 | Abuse prevention, not login |
| Hedera — No Solidity Allowed | $3,000 | 3 | Three native services, zero Solidity |

**$12,500 addressable, 8 winning positions.** Three partner slots, which is the maximum allowed per project.

Hedera's agentic payments track is a bigger pool ($6,000) but requires an actual payment or token transfer on testnet. Seam moves no money. **Don't bolt one on to reach for it.**

## 9. Known risks

**The Friday spike is the gamble.** One sealed call, signature verified against the enclave key, nothing else. If the attestation can't be independently verified, the core claim collapses and we need to know today, not Sunday.

Good news on this: providers generate a signing key inside the TEE, the CPU and GPU attestations include that key's public key, all results are signed with it, and providers expose endpoints to download attestations and response signatures. There's also a TypeScript package with a `verifyEnvelope` helper.

**Non-determinism.** A model isn't a comparison. Pin the model hash, temperature 0, and be precise in the demo: what's attested is *this model saw these committed inputs and returned this verdict*, not *any run returns the same*. Overstating this is what loses the Q&A.

**The model can be wrong.** It's making a judgement. Honest framing: Seam tells you whether it's worth a conversation, not what the deal is. Nobody signs anything on this output.

**One room, one pair.** Reusing a position across rooms is the same probing attack wearing a different hat. Say it out loud in the demo — it's the sharpest question a technical judge can ask.

## 10. Questions to ask at the workshops today

**0G — 14:30, Workshop Room**
- Can we constrain what the model is allowed to emit (structured output / enum)?
- Is the attestation verifiable outside your SDK, and what exactly does the signature cover — does it include the input?
- Submission asks for contract deployment addresses. What if the product doesn't need a contract? *(This one matters — if it's mandatory, we need something on 0G Chain and that's a design decision.)*

**World — 16:30**
- Can a Selfie Check nullifier be scoped per session rather than per app?
- What does "testing documentation" need to contain to qualify?

**Hedera — 17:00**
- Confirm Schedule Service + HCS + Mirror Node counts as three native services for No Solidity.
- Scheduled transaction expiry semantics — what happens if a required signature never arrives?

## 11. Build plan

| When | Ship | Proves |
|---|---|---|
| Fri night | One sealed call, attestation verified | The project is possible at all |
| Sat AM | Session creation + client-side sealing + HCS commitments | Both sides can lock in |
| Sat PM | Enclave call with constrained output, verdict to topic | The core loop closes |
| Sat eve | Two-browser end-to-end, QR code to join | Someone can actually use it |
| Sat late | World testing doc, README, register page | Track requirements |
| **Sat 22:00** | **Feature freeze. Record video.** | We submit |
| Sun 07:00 | Submit, two hours early | Done |

**Suggested split:** one of us on the 0G side (sealing, enclave call, attestation), the other on Hedera (schedule, topic, mirror node reads) plus the World integration and its testing doc.

## 12. Rules that disqualify people every weekend

- **Commit every 30 minutes from hour one**, even when it's ugly. Large single commits or missing history can disqualify.
- **AI attribution is mandatory.** Document which files were AI-assisted. If we use a spec-driven workflow, the spec files and prompts must be committed to the repo, not left in chat history.
- **Video: 2:30 target.** ETHGlobal rejects under 2 minutes; 0G wants under 3. 720p minimum. No AI voiceover — automatic re-submit.
- **World tracks require testing documentation** covering developer friction *and* user friction. Real deliverable, start it Saturday morning while the friction is fresh.
- **Max 3 partner prizes per project.** We're at exactly 3, so no room for error.
- **Re-read the sponsor pages before submitting.** They changed once already during the event.

## 13. The demo

Two laptops. A QR code on the table. One judge scans and becomes the company, the other opens the link and becomes the candidate. Each writes a position. The countdown runs in front of them. One line comes back.

Then run it again with positions that don't fit, and let them notice how little they learned about each other.

**That second run is the pitch.**
