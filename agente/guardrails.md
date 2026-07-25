# Guardrails (hard rules)

> The line we don't cross. First ETH hackathon, zero Solidity, and a product whose entire value is a
> privacy guarantee — so these are non-negotiable.

## What we do
- **Read/verify, not deploy.** Use SDKs (0G router, `@hashgraph/sdk`, `@worldcoin/idkit`).
- Run the verdict inside a **0G TEE** and **verify its attestation independently**.
- Store commitments + verdict on a **Hedera HCS topic**. Read via **Mirror Node**.

## Red lines
- ❌ **No Solidity / no smart contracts.** Zero deploys.
- ❌ **No user private keys / seed phrases. Ever.** This one does not bend.
  The keys we hold are **our own operating accounts** and nothing else:
  **(1)** our Hedera testnet account (writes to the topic), **(2)** our 0G mainnet wallet
  (`OG_WALLET_PRIVATE_KEY` — pays for inference and signs each broker request, added 25 Jul).
  One wallet serves every user and every room, like an OpenAI key on a server. **Seam users have no
  wallet at all**: they type text and read one line. They never sign anything, never pay the enclave,
  and never connect a wallet — Seam is not a dApp. If a design ever needs a key from a user, the design
  is wrong.
- ❌ **The enclave never emits free text.** Enum verdicts only (`workable` / `not_workable` / opt-in `gap:*`).
  Free text leaks.
- ❌ **Never publish a verdict without a valid attestation.** **Fail closed** — a bad signature ⇒ no verdict.

## Hygiene
- Validate **every** external response (0G / Hedera / World) with **Zod** before using it.
- The **commitment must be reproducible**: deterministic serialisation, hash the ciphertext, **no timestamp
  in the committed bytes**.
- Keys/API secrets only on the server, via `src/config/env.ts`. `.env*` is ignored — never commit secrets.
- Plaintext positions live **only in enclave memory** — never persisted, never logged.

## What the attestation actually proves
*This model saw these committed inputs and returned this verdict.* NOT "any run reproduces it." Do not
overstate this in the demo/Q&A — precision here is what wins the technical question.
