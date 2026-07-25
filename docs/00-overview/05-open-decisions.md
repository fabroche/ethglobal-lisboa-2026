# 05 · Open decisions

Status: 🟧 draft · Last updated: 2026-07-25

**Living document.** Open questions with a tentative lean; confirmed answers move to the decision ledger
in `../README.md` (D1…Dn). Several depend on the Friday sponsor workshops — update this file as they're
answered.

| # | Question | Options | Tentative lean | Status | Confirm by |
|---|----------|---------|----------------|:------:|-----------|
| DA1 | Default verdict richness | enum-only (`workable`/`not_workable`) vs opt-in `gap:*` | **Decided 25 Jul (D9 amendment):** default enum-only; with two-sided opt-in the verdict adds `gap:single` \| `gap:multiple` — whether one or several dimensions block, **never which**. Naming the dimension was rejected: "the single blocker" is ill-defined when several block or tradeoffs entangle them, and a forced pick would fabricate an answer | 🟩 decided | — |
| DA2 | Deploy target | Vercel vs Hostinger VPS + Dokploy | **Vercel** for speed (no worker, no DB) — see `../transversal/infra-devops.md` | 🟧 leaning | Sat, before feature freeze |
| DA3 | Does 0G require a **contract deployment address** for submission? | mandatory vs not | **Assume not**; if mandatory we must deploy something on 0G Chain (a real design change) | ⛔ **blocking — open** | 0G workshop (Fri 14:30) |
| DA4 | World **nullifier scope** | per room per side vs per app | **Per room per side** (negotiate many rooms, submit once per side per room) | 🟧 leaning | World workshop (Fri 16:30) |
| DA5 | Scheduled-tx **signature never arrives** | expire vs retry vs manual fire | Need Hedera's semantics before choosing a fallback (e.g. a grace-window then void the room) | ⬜ open | Hedera workshop (Fri 17:00) |
| DA6 | Which exact **0G model** to pin + record its hash | candidate models on the 0G router | Pick one small, fast, deterministic-friendly model; record `OG_MODEL` hash | ⬜ open | during `M7` spike (Fri night) |
| DA7 | Exact **attestation package/endpoint** | `@foundryprotocol/0gkit-attestation` `verifyEnvelope` vs whatever the booth confirms | Use `verifyEnvelope`; treat package/endpoint as unconfirmed until the booth | 🟧 leaning | 0G workshop / `M7` spike |
| DA8 | Write-screen **checklist depth** (D16 presets) | static guidance text only vs in-browser presence heuristics (has a number / a date) | **Static-only** for the deadline; heuristics are a stretch goal — never blocking, plaintext never leaves the browser either way | 🟧 leaning | Sat PM, time permitting |

## Notes

- **DA3 is the one that can change the architecture.** If a contract address is mandatory, Seam is no
  longer strictly "no contract deployed" and we need a minimal presence on 0G Chain — decide this Friday,
  not Sunday.
- **DA6/DA7 are resolved by the Friday-night spike** (`M7` / `spec-03-attest.md`). If the independent
  attestation check doesn't hold, the core claim collapses and we need to know that night.
- Keep this table honest: a wrong tentative lean stated confidently in the Q&A loses more than an open
  question stated plainly.
