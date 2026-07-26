# Video script — 2:45 · human narration (no AI voiceover — track rule)

Status: 🟩 **ready to record** (S5.1). Rewritten 26 Jul ~05:00 against the released build
(`main` @ `528b5d5`, 445 tests green) — every claim below is one the shipped code actually makes.
Narration ≈ 380 words ≈ 2:35 spoken. Record ≥720p, screen capture + one phone shot where marked.

> **Two sentences that must never be said**, because the README explicitly refuses them and a judge
> who read it will catch the contradiction:
> 1. ~~"the only place the two positions exist in the clear together"~~ — **not true of this build**.
>    Unsealing happens on our server for the moment before the enclave call (D-M6-2).
> 2. ~~"Selfie Check"~~ — we ship **device-level World ID** (IDKit v2). Selfie Check is 4.x-only and
>    the portal blocked enablement (M3 §A.6). Say **"World ID"**.

| # | 0:00 | Scene | Shot | Narration (read verbatim, natural pace) |
|---|------|-------|------|------------------------------------------|
| 1 | 0:00–0:15 | The problem | Title card: Overlap logo + "Stop negotiating deals that were never possible." Then two phones face-down on a table. | "Two people want a deal — a house, a job, a block trade. Neither will name their number first, because whoever speaks first loses ground. So they circle, or they pay a broker who ends up knowing everything, or the deal dies before the first call." |
| 2 | 0:15–0:35 | Create a room | Laptop `/create`: pick **Property**, declare your side, set a deadline → room-ready screen with QR. | "One side opens a room: what kind of deal, which side you are, and a deadline. That deadline goes onto a Hedera Consensus topic **before anyone writes a word**, so the clock can never be used as leverage. There's no database anywhere — the topic *is* the storage. And no Solidity: three native Hedera services." |
| 3 | 0:35–1:00 | Write + seal | Two browser windows side by side (side A and side B). Type a real position; the checklist is visible but never blocks. **Phone shot:** the World QR being scanned with World App. | "Each side writes their real position in plain language. One World ID verification per **person, per room** — so the two seats are two different humans, and nobody can sit on both sides or re-submit twenty variations to binary-search your number. Then the position is **sealed in the browser**, encrypted before it travels. Only its fingerprint reaches the chain." |
| 4 | 1:00–1:25 | Don't trust us | Terminal: `npm run inspect`, then `npm run demo:naive`. | "Don't take our word for any of this. Here's our store: only hashes — no plaintext, no key. And here's the same product built *without* the enclave, where the operator reads both positions in the clear. That difference is the entire product." |
| 5 | 1:25–1:50 | The verdict | Both windows on the verdict screen; the reveal fires; the same line appears on both. | "At the deadline, a pinned model inside a 0G trusted enclave reads both positions and answers with **one word from a closed list**: workable, or not. Never why, never by how much. If — and only if — **both** sides agreed in advance, it may add whether **one** issue is in the way, or more than one. Never which one." |
| 6 | 1:50–2:20 | Fail closed | Terminal: `npm run spike` (real signature verifies → one character flipped → rejected). Then the on-chain `curl` printing the enclave key. | "Every verdict carries the enclave's signature, and we check it ourselves — outside 0G's SDK, with general-purpose crypto. Flip one character and it's rejected. If the signature doesn't verify, **no verdict is published at all**. And the key we check against isn't ours to claim: you can read it straight off 0G mainnet." |
| 7 | 2:20–2:45 | Close | The verdict on the public topic via Mirror Node; then the logo. | "The verdict lives on a public topic, so both sides read the same answer and neither has to trust the other — or us. No wallets, no contracts, no database. Remove 0G and the privacy dies. Remove Hedera and the clock dies. Remove World and probing kills it. Overlap: find out whether a deal exists, without showing your hand." |

## What we deliberately do NOT claim on camera

The README carries a "what we prove, and what we don't" section, and the video must not exceed it:

- **We verify the last link.** The enclave's signature against a key we pinned — we do **not** parse
  the Intel TDX quote or walk a cert chain to an Intel root. Scene 6's wording stays at "we check
  the signature ourselves", which is exactly what `npm run spike` shows.
- **The unsealing happens on our server today**, so no line implies otherwise. Scene 3 says "sealed
  in the browser, encrypted before it travels" — true, demonstrable, and not more.
- **Device-level World ID**, not Selfie Check (see the banner above).

## Recording notes

- **The tunnel is dead** (quick `trycloudflare` hostnames returned edge 404s all night, three fresh
  ones tested). So scene 3 is **two browser windows on one laptop at `localhost:3000`**, not a phone
  opening the app. This costs nothing: `localhost` is a secure context, so sealing and the World
  bridge both work, and the phone still appears in shot — scanning the World QR, which goes to
  World's servers rather than to us.
- **Both sides need a different World identity** since D17. Two people, two phones: that is the
  demo, and it is also the proof that the fix works.
- Scene 5 needs a room whose deadline has passed. Seed one ahead of time with
  `npx tsx scripts/seed-room.ts 2` so the countdown lands during the take, and remember the reveal
  is lazy: the **first** reader past the deadline triggers it, so open the verdict screen fresh.
- Keep `not_workable` neutral on screen (never red) — it is the product working, not an error.
- For a `workable` take, use overlapping numbers. Verified live: a 260k buyer against a 250k floor
  returns `workable`; the same texts at 200k return `gap:single`.
- Scene 4 and 6 terminals: bump the font and use a light-on-dark theme that survives compression.
- Narration by a human, one voice throughout; record it separately and cut the picture to fit.
