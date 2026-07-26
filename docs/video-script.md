# Video script — 2:30 · human narration (no AI voiceover — track rule)

Status: 🟧 draft (S5.1 prep). Placeholders: Overlap = DA9 decision · `[SHOT:…]` = record after the
flow unblocks (Frank's tunnel + seal answers, reveal runner). Narration ≈ 350 words ≈ 2:20 spoken.
Record ≥720p, screen + phone over-the-shoulder where marked.

| # | 0:00 | Scene | Shot | Narration (read verbatim, natural pace) |
|---|------|-------|------|------------------------------------------|
| 1 | 0:00–0:15 | The problem | Title card: Overlap + logo. Then two phones face-down on a table. | "Two people want a deal — a house, a job, a block trade. Neither will name their number first, because whoever speaks first, loses ground. So most deals die before the first phone call. Overlap fixes the going-first problem." |
| 2 | 0:15–0:35 | Create a room | Laptop: `/create` — pick **Property**, set deadline, QR appears. | "One side opens a room: pick the kind of deal, set a deadline. The deadline is published to a Hedera Consensus topic **before anyone writes a word** — the clock can never be used as leverage. No database anywhere: the topic *is* the storage. And no Solidity — three native Hedera services." |
| 3 | 0:35–1:00 | Write + seal (the core) | Phone over-the-shoulder: scan QR → write screen, checklist visible → Selfie Check → `[SHOT: seal & commit success state]`. | "The other side joins by QR — on their own phone. Each writes their real position in plain language; the guidance never blocks. One World ID Selfie Check per side — one seat, so nobody can probe with twenty fake positions. Then the position is **sealed in the browser**, encrypted to the enclave. Only its fingerprint touches the chain." |
| 4 | 1:00–1:20 | Prove it (the two demos) | Terminal split: `npm run inspect` output; then `npm run demo:naive`. | "Don't take our word. Our store holds only hashes — here's the inspection. And here's the same product built naively, without the enclave: the operator reads everything. That difference is the entire product." |
| 5 | 1:20–1:50 | The verdict | `[SHOT: countdown hits zero → verdict renders on BOTH screens]`. | "At the deadline, a pinned model inside a 0G trusted enclave reads both positions — the only place they ever exist in the clear together — and answers one word: workable, or not. Never why, never by how much. With BOTH sides' consent, at most one more bit: one issue blocks, or several. Nobody learns which." |
| 6 | 1:50–2:10 | Fail closed | `[SHOT: attestation verify output — verifyEnvelope OK]`. | "Every verdict carries a hardware attestation, and we verify the signature ourselves, outside 0G's SDK. No valid attestation — no verdict published. The system fails closed." |
| 7 | 2:10–2:30 | Close | Both screens showing the same verdict; logo. | "No wallets, no contracts, no database, no operator who can peek. Remove 0G, the privacy dies. Remove Hedera, the clock dies. Remove World, probing kills it. Overlap: find out if there's a deal — without showing your hand." |

## Recording notes
- Scene 3 is the money shot: real phone, real Selfie Check — **needs the HTTPS origin** (Frank #1)
  and the seal answer (Frank #2). Everything else is recordable now.
- Scene 5 needs the reveal runner (S2.9) writing a real verdict; fallback if it slips: seed the
  verdict message with the demo script and say "scheduled reveal" honestly over it.
- Scene 4 uses Frank's `demo-naive` (S4.2) — coordinate the terminal theme/fonts for legibility.
- Keep `not_workable` neutral on screen (never red) — it's the product working.
- Narration by a human, one voice throughout; record narration separately and cut to fit.
