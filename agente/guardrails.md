# Guardrails (hard rules)

> The line we don't cross. First ETH hackathon, zero Solidity, and a product whose entire value is a
> privacy guarantee — so these are non-negotiable.

## What we do
- **Read/verify, not deploy.** Use SDKs (0G router, `@hashgraph/sdk`, `@worldcoin/idkit`).
- Run the verdict inside a **0G TEE** and **verify its attestation independently**.
- Store commitments + verdict on a **Hedera HCS topic**. Read via **Mirror Node**.

## Red lines
- ❌ **No Solidity / no smart contracts.** Zero deploys.
- ❌ **No user private keys / seed phrases.** The only key we hold is **our own Hedera testnet account**.
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
