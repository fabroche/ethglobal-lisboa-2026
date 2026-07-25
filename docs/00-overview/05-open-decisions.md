# 05 · Open decisions

Status: 🟧 draft · Last updated: 2026-07-24

**Living document.** Open questions with a tentative lean; confirmed answers move to the decision ledger
in `../README.md` (D1…Dn). Several depend on the Friday sponsor workshops — update this file as they're
answered.

| # | Question | Options | Tentative lean | Status | Confirm by |
|---|----------|---------|----------------|:------:|-----------|
| DA1 | Default verdict richness | enum-only (`workable`/`not_workable`) vs opt-in `gap:*` | **Default enum-only; `gap:*` only if BOTH sides opted in** — richest verdict both consented to | 🟧 leaning | product decision |
| DA2 | Deploy target | Vercel vs Hostinger VPS + Dokploy | **Vercel** for speed (no worker, no DB) — see `../transversal/infra-devops.md` | 🟧 leaning | Sat, before feature freeze |
| DA3 | Does 0G require a **contract deployment address** for submission? | mandatory vs not | **Assume not**; if mandatory we must deploy something on 0G Chain (a real design change) | ⛔ **blocking — open** | 0G workshop (Fri 14:30) |
| DA4 | World **nullifier scope** | per room per side vs per app | **Per room per side** (negotiate many rooms, submit once per side per room) | 🟧 leaning | World workshop (Fri 16:30) |
| DA5 | Scheduled-tx **signature never arrives** | expire vs retry vs manual fire | Need Hedera's semantics before choosing a fallback (e.g. a grace-window then void the room) | ⬜ open | Hedera workshop (Fri 17:00) |
| DA6 | Which exact **0G model** to pin | candidate models on the 0G router | **`0gm-1.0-35b-a3b`** — TeeML chatbot with `provider_count: 1` | 🟩 **decided** | resolved via `/v1/models` |
| DA7 | Exact **attestation package/endpoint** | `@foundryprotocol/0gkit-attestation` `verifyEnvelope` vs our own | **Our own `verifyEnvelope`** — the package is unresolvable, and a vendor verifier defeats RNF-M7-001 | 🟩 **decided** | `spec-03-attest.md` §1 |
| DA8 | 0G **network**: testnet or mainnet | testnet (free) vs mainnet (real 0G) | **Mainnet** — testnet has no TeeML chat model, so sealed evaluation cannot run there | 🟩 **decided** | resolved via `/v1/models` |

## Notes

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
