# CLAUDE.md — ethglobal-lisboa-2026

## Qué es este repositorio
Proyecto para la hackathon **ETHGlobal Lisbon 2026**. Un **agente IA sobre datos on-chain**
(finanzas cripto en lenguaje natural), reusando la arquitectura de `home-os`. **Sin Solidity,
sin smart contracts propios: on-chain = solo lectura.**

> **La idea AÚN está en decisión.** Recomendada (tentativa): *Crypto Copilot / "Contador
> On-Chain"* — leer una wallet (read-only), calcular PnL/base de costo y generar borradores de
> reporte fiscal. Ver `MEMORIA.md` y `docs/00-overview/05-decisiones-abiertas.md`.

Stack: **Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase · Zod · The Graph · viem**.
Monolingüe (español; términos web3 en inglés).

## Equipo
- **Dueño del repo (fabroche):** fullstack senior (web2/IA). Primera hackathon ETH, cero Solidity.
- **Socio:** trader (5+ años cripto) + contador → define las métricas financieras y el "wow" del reporte.

## Comandos
```powershell
npm run dev        # dev server (Turbopack)
npm run build      # build de producción (standalone)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (unit + RTL)
npm run test:e2e   # Playwright
npm run worker     # worker local (cron + runner IA)
npm run storybook  # Storybook (:6006)
```

## Arquitectura clave
- **Capas** (dirección única): `app/` → `lib/actions` (Zod) → `lib/services` (dominio) →
  `lib/{onchain,supabase,ai}` → APIs externas. La UI **no** importa `lib/onchain` directo.
- **`src/config/env.ts`** — validación de env con Zod (fail-fast). Leer env SIEMPRE de aquí.
- **`src/lib/onchain/`** — lectura on-chain: `thegraph.ts` (subgraphs vía `graphql-request`) y
  `viem.ts` (cliente público: ENS, balances, ERC-20 read). **Solo lectura.**
- **`worker/`** — proceso aparte: cron + **runner IA** (drena `ai_jobs`).
- **`src/app/globals.css`** — Tailwind v4 `@theme` (sin `tailwind.config.js`). Sistema editorial:
  Inter Tight + Instrument Serif italic, marca violeta/índigo, light+dark (next-themes).

## IA de runtime (importante)
La IA usa **Claude Code headless con la suscripción** (`claude -p`), **sin API key**. La app encola
tareas en `ai_jobs` (Supabase) y el `worker` las drena. **Engine-agnóstico**: migrar a
`ANTHROPIC_API_KEY` sería cambiar solo el runner.

## Reglas transversales
- **React 19**: `ref` es prop normal (no `forwardRef`).
- **Server Actions**: `'use server'` + Zod en `src/lib/actions/`.
- **`cn()`** (`src/lib/utils.ts`) para clases condicionales, siempre.
- **Tailwind v4**: nunca `tailwind.config.js`; tokens en `globals.css @theme`.
- **Mobile-first (OBLIGATORIO)**: base móvil; se escala con `sm:`/`md:`/`lg:`.
- **date-fns** (no Moment).
- **Reglas web3 duras** (ver `agente/reglas-web3.md`): solo lectura on-chain; **cero private keys**;
  sin Solidity; validar con **Zod** toda respuesta de subgraph/RPC; paginar; rate-limit + retry.

## Estrategia de premios (hackathon)
Objetivo: **apilar 2–3 sponsors de bajo riesgo web3** con un solo producto. Foco: **The Graph**
(leer subgraphs + MCP/AI tooling) + **ENS** (identidad de agentes) + **Hedera** opcional. Evitar
1inch/Sui (Solidity/Move/opcodes). Detalle en `docs/00-overview/03-mapa-premios-sponsors.md`.

## Documentación y subagentes
- Especificaciones en **`docs/`** (overview + módulos tentativos + transversales). Empezar por `docs/README.md`.
- Banco de contexto del dev en **`agente/`** (`stack.md`, `reglas-web3.md`).
- Subagentes en **`.claude/agents/`**: `frontend`, `backend`, `onchain-data`, `ia-agente`, `devops`, `qa-testing`.
- Skills del proyecto: `the-graph`, `verify` (locales) + `copywriting` (para landing/pitch).
- **MCP**: The Graph Subgraph MCP en `.mcp.json` (confirmar paquete/endpoint exacto en el booth).

## Módulos (TENTATIVOS — sujetos a la decisión de idea)
| ID | Módulo |
|----|--------|
| M1 | Ingesta on-chain (wallets read-only) |
| M2 | Motor de PnL / base de costo |
| M3 | Reportes IA (borradores fiscales/PnL) |
| M4 | Asistente IA (cola `ai_jobs` + runner headless) |
| M5 | MCP The Graph (cimiento, idea C) |

## Estado actual
**Andamiaje recién creado** (scaffold + documentación). Idea **en decisión**. Siguiente paso:
cerrar idea/alcance con el socio (`docs/00-overview/05-decisiones-abiertas.md`), sacar API keys
(The Graph, RPC), y montar el primer flujo end-to-end (dirección/ENS → leer on-chain → reporte).

## Setup
1. `cp .env.example .env.local` y rellenar (Supabase, The Graph, RPC, Claude token).
2. `npm install`.
3. `npm run dev`.
