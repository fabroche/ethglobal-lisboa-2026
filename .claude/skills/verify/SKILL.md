---
name: verify
description: Local E2E verification recipe for Seam — run the app, drive the two-browser flow (open room → write+seal → verdict), and check the privacy properties (ciphertext-only store, fail-closed attestation). Use to verify a change in the running app, not only with unit tests.
---

# Local E2E verification — Seam

> In a hackathon, prioritise verifying the **demo flow** end-to-end with real services.

## Recipe

1. **Dev server**: `npm run dev` (background). Wait for the home to return 200
   (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`) — first compile is slow with Turbopack.

2. **Two-browser flow** with Playwright (`@playwright/test`; first time: `npx playwright install chromium`).
   Open two contexts (company + candidate). Flow: A opens a room (deadline to Hedera) → scan/enter link →
   both write a position → World Selfie Check → seal + commit → scheduled reveal → both read the same
   one-line verdict via Mirror Node. Screenshot each step.

3. **Privacy checks** (this is the point, not just "it works"):
   - `npm run inspect` — the store holds **ciphertext only**; we hold no key.
   - `npm run demo:naive` — the same product **without** the enclave leaks both positions (the contrast).
   - Tamper one byte of the attestation → **no verdict published** (fail closed).

4. **Test data**: use two throwaway positions that clearly do / don't overlap (e.g. seller ≥400k vs
   buyer ≤400k → `workable`; buyer ≤380k → `not_workable`). No private keys anywhere — the flow is sealed.

## Notes
- Requires 0G / Hedera testnet / World credentials in `.env.local` (see `.env.example`).
- Record the run — several sponsors require a **video demo** (2–4 min, 720p+, no AI voiceover).
