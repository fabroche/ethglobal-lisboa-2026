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
| DA6 | Which exact **0G model** to pin | candidate models on the 0G router | **`0gm-1.0-35b-a3b`** — TeeML chatbot with `provider_count: 1` | 🟩 **decided** | resolved via `/v1/models` |
| DA7 | Exact **attestation package/endpoint** | `@foundryprotocol/0gkit-attestation` `verifyEnvelope` vs our own | **Our own `verifyEnvelope`** — the package is unresolvable, and a vendor verifier defeats RNF-M7-001 | 🟩 **decided** | `spec-03-attest.md` §1 |
| DA8 | 0G **network**: testnet or mainnet | testnet (free) vs mainnet (real 0G) | **Mainnet** — testnet has no TeeML chat model, so sealed evaluation cannot run there | 🟩 **decided** | resolved via `/v1/models` |
| DA9 | Write-screen **checklist depth** (D16 presets) | static guidance text only vs in-browser presence heuristics (has a number / a date) | **Static-only** for the deadline; heuristics are a stretch goal — never blocking, plaintext never leaves the browser either way | 🟧 leaning | Sat PM, time permitting |
| DA10 | 0G **signature retrieval path** | Router (Bearer key) vs direct-to-broker (on-chain payment) | **Direct to broker** — the Router pays the broker with its own wallet, so it is the broker's customer and we can never obtain a signature for our own call. Being the paying customer is the price of being able to verify | 🟩 **decided 25 Jul** | `handoff-open-threads.md` §1 |
| DA11 | **Product name** | keep **Seam** vs rename → **Overlap** (alts raised: Venn, BlindMatch, SealedBid) | **Lean Overlap** — Dylan's pick; converging-chevrons mark + tokens designed (design-system §Brand — Overlap; exploration artifact). **Confirm with Frank, then apply via S4.8.** Rename touchpoints: README/docs, UI copy, `roomActionId` prefix (`seam-`→`overlap-` — changes derived nullifiers, fine pre-launch), World app display name (app_id unaffected), video script | 🟧 leaning | **before S5.1 video / S4.4 README — Sat night, hard stop** |

## Notes

> **Numbering.** Two people added a `DA8` on 25 Jul from separate branches (0G network vs write-screen
> checklist) and the collision only surfaced at merge. The 0G one kept the number — it was there first,
> it is closed, and it is cited from `src/config/env.ts` — and the checklist became **DA9**. Before
> claiming an ID, `grep` for it on `origin/develop`, not just locally.
>
> It happened a second time on the next merge: the **product name** was filed as `DA9` on
> `develop-dylan` (commit `42319df`) while `DA9`/`DA10` were already taken here. Same rule applied —
> the older, cited entries keep their numbers and the product name is now **DA11**. It is the only
> renumbering; nothing else moved. ⚠ **dylan:** `9bf26bb` and backlog `S4.8` both call the product
> name "DA9" — it is **DA11** here. The content of your row was carried over intact; only the id moved.

- **DA3 is the one that can change the architecture.** If a contract address is mandatory, Seam is no
  longer strictly "no contract deployed" and we need a minimal presence on 0G Chain — decide this Friday,
  not Sunday.
- **DA6/DA7/DA8 are resolved.** The spike proved independent verification offline (PART A GO), and the
  catalog at `GET /v1/models` (no auth needed) answered the rest:

  | Network | Models | Usable for Seam? |
  |---|---|---|
  | testnet | `qwen-image-edit` (TeeML, **image editing**) · `qwen2.5-omni` (chatbot, **TeeTLS**) | **No** — TeeML *or* chat, never both |
  | mainnet | 23 models, of which 3 are TeeML chatbots | **Yes** |

  **We deliberately picked a weaker model.** `glm-5.2` is stronger but serves from 3 providers;
  `0gm-1.0-35b-a3b` serves from 1, so the enclave signing key cannot rotate and a static
  `OG_ENCLAVE_PUBKEY` stays valid. When the product is "we can prove who signed this", a stable
  signer is worth more than a smarter model. **Expect this question in the Q&A** — it is a good answer.

- **Still open on 0G, both booth questions:** which endpoint serves the enclave signing pubkey, and
  whether a separate *encryption* key exists for `seal` (an attestation address cannot be encrypted to).
  Until both are answered, PART B of the spike cannot fully close.
- Keep this table honest: a wrong tentative lean stated confidently in the Q&A loses more than an open
  question stated plainly.
