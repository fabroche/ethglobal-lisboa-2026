# Stack y decisiones (chuleta)

- **Next.js 16** (App Router, RSC, Server Actions) · **React 19** (`ref` prop, no `forwardRef`).
- **TypeScript** estricto (`noUncheckedIndexedAccess`) · alias `@/*`.
- **Tailwind v4** CSS-first (`globals.css @theme`, sin `tailwind.config.js`) · **shadcn/ui** (new-york, slate) · light+dark (next-themes).
- **Supabase** (Postgres + Auth + RLS) — almacén/espejo/analítica + cola `ai_jobs`.
- **Zod** en todas las fronteras (Server Actions, respuestas de subgraph/RPC, salidas IA).
- **date-fns** (no Moment).
- **The Graph** vía `graphql-request` — subgraphs por el gateway (`THE_GRAPH_API_KEY`). MCP en `.mcp.json`.
- **viem** — cliente público (SOLO LECTURA): ENS, balances, lecturas ERC-20. Cero private keys.
- **IA runtime**: **Claude Code headless** (`claude -p`, suscripción, **sin API key**); cola `ai_jobs` + runner en `worker/`.
- **Deploy**: por decidir (Vercel rápido para hackathon vs VPS + Dokploy + Docker como home-os).

## Capas (dirección de dependencias)
`app/` → `lib/actions` (Zod) → `lib/services` (dominio) → `lib/{onchain,supabase,ai}` → externas.
La UI **no** importa `lib/onchain` directo. La lógica de negocio **no** vive en la capa de datos.

## Reglas duras web3
- On-chain = **solo lectura** en el MVP. Nunca claves privadas ni firma de transacciones.
- Validar con Zod TODA respuesta de subgraph/RPC (no confiar en el shape). Paginar. Rate-limit + retry.
- Sin Solidity / sin deploy de contratos.

## Env
Siempre desde `src/config/env.ts` (validado, fail-fast). Nunca `process.env.X ?? ""`.
