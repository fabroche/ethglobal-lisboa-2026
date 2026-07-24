# Dev context — agents

Quick reference for the subagents. Read the relevant file **before** working in each area.
Full specs live in `docs/`; this is routing + cheat-sheets.

| Topic | Read |
|-------|------|
| Vision, scope, modules | `docs/00-overview/00-vision-scope.md` |
| Architecture & layers | `docs/00-overview/01-architecture.md` + `agente/stack.md` |
| Data model (HCS messages, no DB) | `docs/00-overview/02-data-model.md` |
| Sponsors & prizes strategy | `docs/00-overview/03-sponsors-prizes.md` |
| Conventions | `docs/00-overview/04-conventions.md` |
| **Guardrails (hard rules)** | `agente/guardrails.md` |
| 0G (sealed inference + attest) | `docs/transversal/integration-0g.md` |
| Hedera (HCS + Schedule + Mirror) | `docs/transversal/integration-hedera.md` |
| World (Selfie Check) | `docs/transversal/integration-worldid.md` |
| Security & privacy (threat model) | `docs/transversal/security-and-privacy.md` |
| Quality / tests | `docs/transversal/quality-and-testing.md` |
| **Backlog (what to build next)** | `docs/backlog.md` |
| **Branching rules** | `docs/branching-strategy.md` |

## Subagents (`.claude/agents/`)
`frontend` · `zerog` · `hedera` · `world` · `devops` · `qa-testing`

## Reminder
First ETH hackathon. **No Solidity, no smart contracts. No user private keys.** The AI verdict runs in a
**0G TEE**; the register lives on **Hedera HCS**; **World** gives one seat per side. Work is pull-based
from `docs/backlog.md`. Repo language: **English**.
