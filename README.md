# ETHGlobal Lisboa 2026

Proyecto para la hackathon **ETHGlobal Lisbon 2026**: un **agente IA sobre datos on-chain**
(finanzas cripto en lenguaje natural), reusando la arquitectura de `home-os`.
**Sin Solidity — on-chain solo lectura.**

## Punto de partida
- 📄 **[MEMORIA.md](./MEMORIA.md)** — contexto completo: equipo, stack, mapa de premios, ideas de MVP, recomendación. **Empezar por aquí.**
- 📄 **[CLAUDE.md](./CLAUDE.md)** — instrucciones del repo para trabajar con Claude Code.
- 📁 **[docs/](./docs/README.md)** — documentación técnica (visión, arquitectura, módulos tentativos, transversales, estrategia de premios).
- 📁 `agente/` — banco de contexto para los subagentes (`stack.md`, `reglas-web3.md`).

## Estado
**Fase de decisión de idea** (durante la hackathon). Andamiaje + documentación listos; falta cerrar
el MVP con el socio → ver `docs/00-overview/05-decisiones-abiertas.md`.

## Idea recomendada (tentativa)
**Crypto Copilot / "Contador On-Chain"** — agente IA que lee posiciones on-chain (read-only) y genera
PnL, base de costo y borradores fiscales. Apila premios de **The Graph** + **ENS** (+ Hedera opcional).

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase · Zod · The Graph (`graphql-request`) ·
viem (ENS/RPC read) · Claude Code headless (IA de runtime, sin API key).

## Setup
```bash
cp .env.example .env.local   # rellenar Supabase, The Graph, RPC, Claude token
npm install
npm run dev
```

## Estructura
```
docs/            # documentación técnica (empezar por docs/README.md)
agente/          # banco de contexto para subagentes
src/
  app/           # Next.js App Router (layout, page, globals.css)
  components/    # UI (shadcn + tema)
  config/env.ts  # validación de entorno (Zod, fail-fast)
  lib/
    actions/     # Server Actions (Zod)
    services/    # dominio (PnL, reportes)
    onchain/     # The Graph + viem (SOLO LECTURA)
    supabase/    # clientes SSR
    ai/          # contratos IA
supabase/        # migraciones + RLS
worker/          # cron + runner IA headless
.claude/         # subagentes, skills, settings
```
