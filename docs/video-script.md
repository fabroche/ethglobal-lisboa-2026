# Video script — ~3:00 · human narration (no AI voiceover — track rule)

Status: 🟩 **ready to record** (S5.1). Written 26 Jul against the released build (`main` @ `528b5d5`,
445 tests green). Structure follows the format the hackathon host shared as reference: quick team
intro → elevator pitch → live demo → under the hood → what's next → CTA.

**Speak it, don't read it.** The narration below is the *content* of each beat, written in spoken
register. Paraphrase freely, use your own transitions ("okay, so…", "let's jump into the demo"), and
let the pauses be natural. A take that sounds recited loses to one that sounds like you explaining
your project to someone standing next to you.

> ## ⛔ Two sentences that must never be said
>
> Both are claims our own README explicitly refuses. A judge who read it will catch the contradiction.
>
> 1. ~~"the only place the two positions exist in the clear together"~~ — **not true of this build.**
>    Unsealing happens on our server for the moment before the enclave call (D-M6-2). Covered
>    honestly in beat 5 instead.
> 2. ~~"Selfie Check"~~ — we ship **device-level World ID** (IDKit v2). Selfie Check is 4.x-only and
>    the developer portal blocked enablement. Say **"World ID"**. It appears in beat 5 as what's next.

---

## The script

| # | 0:00 | Scene | Shot | Say this |
|---|------|-------|------|----------|
| **1** | 0:00–0:20 | **Intro + pitch** | Title card: Overlap logo. Cut to the two of you, or straight to screen. | **Frank:** "Hi, we're team Overlap — I'm Frank, I built the sealed inference and the attestation side." **Dylan:** "And I'm Dylan — Hedera, World ID and the web app." **Frank:** "Overlap solves the going-first problem in a negotiation. Two sides write what they want in plain language, a model inside a trusted enclave reads both, and it answers one word to both of them: is there a deal here or not. Neither side sees the other's terms. Neither do we. No database, no smart contract, no Solidity." |
| **2** | 0:20–0:50 | **Demo: open a room** | Laptop, `/create`. Pick **Property**, declare your side, set a deadline a couple of minutes out. Land on the room-ready screen with the QR. | **Dylan:** "Let's jump into the demo. One side opens a room — what kind of deal, which side you are, and a deadline. That deadline goes onto a Hedera Consensus topic *before anybody writes a word*, so neither side can stall and use the clock as leverage. And there's no database in this project at all — the topic **is** the storage." |
| **3** | 0:50–1:25 | **Demo: both sides write and seal** | **Split screen: two browser windows side by side.** Type a real position in each — e.g. buyer "up to 260k, 10% deposit, can sign from 15 August"; seller "not below 250k, deposit at least 10%, deed by December". **Phone in shot:** scan the World QR with World App. | **Dylan:** "Now both sides write their actual position, in plain language — the checklist is guidance, it never blocks you. Each person does one World ID verification, scoped to this room. That's one seat per *person*, so the two sides really are two different humans — you can't sit on both sides, and you can't come back and re-submit twenty variations to binary-search the other person's number. Then the position gets **sealed in the browser**, encrypted before it travels. What reaches the chain is a hash — just a fingerprint." |
| **4** | 1:25–1:50 | **Demo: the verdict** | Both windows on the verdict screen. The deadline passes, the reveal fires, the same line renders on both. | **Dylan:** "The deadline hits. A pinned model inside a 0G enclave reads both positions and answers with one value from a closed list — workable, or not workable. Never why, never by how much. And if *both* sides opted in beforehand, it can add whether one issue is in the way, or more than one. Never which one. Same answer, both screens, at the same time." |
| **5** | 1:50–2:35 | **Under the hood — the hard part** | Terminal, large font. Run `npm run spike`: real signature verifies → one character flipped → rejected. Then briefly `npm run demo:naive`. | **Frank:** "So here's what's underneath, and the hardest problem we solved. You can ask a provider's SDK whether its own response is valid, and it'll say yes — but that proves nothing, because that SDK is exactly the thing you're trying not to trust. So we verify the signature ourselves, outside their SDK, with general-purpose crypto: we recover who signed it and compare that against a key we pinned separately. Nothing from 0G gets a vote in that decision. This is it running — real signature, verifies. Flip one character…rejected. And if it doesn't verify, no verdict gets published at all. It fails closed. This right here is the same product built *without* the enclave — and the operator reads both positions in the clear. That difference is the whole project." |
| **6** | 2:35–2:50 | **What we don't claim + what's next** | Back to a slide or the README's "what we prove" section on screen. | **Frank:** "Two honest limits. We verify the last link — the enclave's signature against a pinned key — we don't parse the whole hardware quote down to an Intel root. And today the decryption happens on our server for a moment before the call, because 0G's inference endpoint has nowhere to put a decryption key. Closing that is a config change once they expose one, not a redesign. Next up: World's Selfie Check once 4.0 enablement unblocks, and persisting the sealed payloads on the topic itself." |
| **7** | 2:50–3:05 | **CTA + thanks** | Terminal listing the four commands; then the room id on the topic; then the logo. | **Dylan:** "Everything we just claimed, you can check yourself — four commands in the repo: verify a real enclave signature, inspect what our storage actually holds, run the whole loop live, and see the naive version leak. There's a verdict already on the public topic you can read through Mirror Node without asking us for anything. Thanks for watching." |

---

## Recording notes

**Setup**
- Two browser windows **on one laptop at `localhost:3000`** — that is a secure context, so both the
  sealing and the World bridge work. A phone opening the app needs HTTPS, and the quick tunnels were
  dying all night; don't build the shot on one.
- **Two different World identities are required** since D17 — two people, two phones. That *is* the
  demo, and it's also proof the fix works.
- Seed a room so the countdown lands during the take: `npx tsx scripts/seed-room.ts 2`.
- The reveal is lazy — the **first** reader past the deadline triggers it. Open the verdict screen
  fresh, and give Mirror Node ~3 s to index before expecting the line.

**Content**
- For a **workable** take use overlapping numbers. Verified live: buyer at 260k against a 250k floor
  returns `workable`; the same texts at 200k return `gap:single`.
- Keep `not_workable` neutral on screen — never red. It is the product working, not an error.
- Terminals: bump the font size and use high contrast; they compress badly otherwise.

**Rules that disqualify**
- **Human narration only.** No AI voiceover, at all.
- ≥720p, 2–4 minutes.

**Screen copy**
✅ **Resolved before recording (26 Jul):** the gate copy now reads "Verify with World ID (one seat per person)", "World ID verified" and "World ID isn't configured yet". Screen and narration agree, and the button also states the D17 guarantee. Internal comments still say Selfie Check — they are module history and never reach the camera.
