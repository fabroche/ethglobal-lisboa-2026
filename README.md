# Seam

**Sealed two-party negotiation.** Two sides write their terms in plain language into a sealed session.
A model running inside sealed hardware (a TEE) reads both and returns **one line to both** — whether a
deal is `workable` — without either side, or us, ever seeing the other's terms.

> A referee locked in a windowless room. You both slide a paper under the door. The referee says "yes"
> or "no" through the door. Then the papers burn.

**ETHGlobal Lisbon 2026** · submission deadline Sunday 26 July, 09:00 WEST.

## Why it can't be built normally
A plain server would see both positions, so no counterparty would trust it. The sealed enclave is the
whole reason this is usable, not a feature bolted on. Three things must be true at once — and that's why
there are three sponsors:

- **0G** — sealed inference. The referee no operator can look into.
- **Hedera** — locks both commitments and holds the deadline (a clock we don't control).
- **World** — one seat per side, so nobody probes the other's number across many sessions.

## How it works
```
Side A opens a room     → deadline published to Hedera before anyone writes
Both sides write + seal  → encrypted in-browser to the enclave key
One seat per side        → World Selfie Check, one nullifier per room per side
Commitments locked       → sha256(ciphertext) + timestamp to an HCS topic
Sealed evaluation        → pinned model, temp 0, inside a 0G TEE
Attestation verified     → fails closed: bad signature ⇒ no verdict
Scheduled reveal fires   → verdict written to topic, both read via Mirror Node
```

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Zod · 0G (sealed inference) ·
Hedera (HCS + Schedule + Mirror Node) · World (Selfie Check). **No database, no smart contract.**

## Getting started
```bash
cp .env.example .env.local   # fill 0G, Hedera testnet, World
npm install
npm run dev
```

## Docs
Start at **[docs/README.md](./docs/README.md)** — vision, architecture, module specs (RF/RNF),
sponsor integrations, security & privacy, backlog and branching strategy.
Working with Claude Code? See **[CLAUDE.md](./CLAUDE.md)**.

## Team
Two AI-assisted workstreams (`develop-frank`, `develop-dylan`) over one `develop`, released to `main`.
See [docs/branching-strategy.md](./docs/branching-strategy.md) and [docs/backlog.md](./docs/backlog.md).
