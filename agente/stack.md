# Stack & decisions (cheat-sheet)

- **Next.js 16** (App Router, RSC, Server Actions) · **React 19** (`ref` prop, no `forwardRef`).
- **TypeScript** strict (`noUncheckedIndexedAccess`) · `@/*` alias.
- **Tailwind v4** CSS-first (`globals.css @theme`, no `tailwind.config.js`) · **shadcn/ui** (new-york, slate) · light+dark.
- **Zod** at every boundary (Server Actions, 0G/Hedera/World responses).
- **date-fns** (no Moment).
- **0G** — sealed inference via OpenAI-compatible router (`openai` client, `OG_ROUTER_URL`); independent
  attestation check (`verifyEnvelope`).
- **Hedera** — `@hashgraph/sdk`: HCS topic (storage), Schedule Service (clock), Mirror Node (read).
- **World** — `@worldcoin/idkit`: Selfie Check, one nullifier per room per side.
- **No database, no smart contract, no worker.** Storage IS the HCS topic.
- **Deploy**: TBD (Vercel fast for hackathon vs VPS).

## Layers (dependency direction)
`app/` (UI) → module libs `src/{session,seal,worldid,registry,scheduler,evaluator}` → external SDKs.
The UI never talks to an SDK directly. Env only via `src/config/env.ts` (validated, fail-fast).

## Hard guardrails
See `agente/guardrails.md`. TL;DR: no Solidity, no user keys, enclave emits enum only, fail closed,
validate every external response with Zod.
