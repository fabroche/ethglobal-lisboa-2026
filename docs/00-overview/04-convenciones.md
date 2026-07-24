# 04 · Convenciones

## Código
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`). Nada de `any` (lint en `warn`, tratar como error en revisión).
- **Alias** `@/*` → `src/*`.
- **React 19**: `ref` es prop normal (no `forwardRef`). Server Components por defecto; `"use client"` solo cuando haga falta.
- **Server Actions**: `'use server'` + validación **Zod** de la entrada, en `src/lib/actions/`.
- **`cn()`** (`src/lib/utils.ts`) para clases condicionales, siempre.
- **Tailwind v4**: tokens en `globals.css` bajo `@theme`. **No** crear `tailwind.config.js`.
- **Fechas**: `date-fns` (nunca Moment). Timestamps on-chain se normalizan a `Date`/ISO al mapear.
- **Env**: leer SIEMPRE desde `src/config/env.ts` (validado con Zod, fail-fast), nunca `process.env.X ?? ""` suelto.

## Capas (dirección de dependencias)
`app/` → `lib/actions` → `lib/services` → `lib/{onchain,supabase,ai}` → APIs externas.
Nunca al revés. La UI no importa `lib/onchain` directamente; el negocio (PnL, base de costo, reglas
contables) vive en `lib/services`, no en la capa de datos.

## On-chain (reglas duras — ver `transversal/integracion-thegraph.md` e `integracion-onchain.md`)
- **SOLO LECTURA en el MVP.** `lib/onchain` no expone `sign`/`send`; no se importa ninguna private key.
- **Nunca manejar private keys ni seed phrases** en el front, el back, el repo ni el env. Las **direcciones
  de wallet son públicas** y sí pueden ir en el repo/env de ejemplo.
- **Validar con Zod TODA respuesta** de subgraph (GraphQL) y de RPC. No confiar en el shape: el dato viene
  de un tercero y puede cambiar/faltar. El resto de la app solo ve DTOs de dominio, nunca el shape crudo.
- **Paginar siempre** las queries de The Graph (`first`/`skip` o cursores); no truncar en silencio.
- **Rate-limit + retry** ante límites del gateway / RPC (backoff, respetar `Retry-After` si lo hay).
- **Idempotencia**: espejar por clave natural (`tx_hash`, `(wallet, token)`), no duplicar al re-sincronizar.

## Nomenclatura
- Archivos de componentes: `kebab-case.tsx`; componentes: `PascalCase`.
- Módulos en docs: `Mx-nombre.md`; IDs estables `RF-Mx-001`, `F-Mx-N`.
- Tablas Supabase: `snake_case`, en español (coherente con el dominio). Términos web3 (wallet, token,
  swap, on-chain) se dejan en inglés dentro de los nombres cuando es la convención (`movimiento_onchain`).

## Git
- Rama por trabajo + PR. Commits convencionales (`feat:`, `fix:`, `docs:`, `chore:`).
- Nada experimental ni backups (`*~`) ni `console.log` crudos en commits.
- **En hackathon**: `main` puede ir más suelto por velocidad, pero sin secretos y sin claves privadas jamás.

## Definition of Done (UI)
Componente no trivial = implementación + **test (RTL/Vitest)**. E2E críticos con Playwright. Ver
`transversal/calidad-y-pruebas.md`. (En hackathon se prioriza el flujo demo end-to-end; el DoD completo
es la meta, no un bloqueo para demostrar.)

## Seguridad
- **Cero private keys / seed phrases** en repo, env o Supabase. **Nunca**. On-chain es solo lectura (D4).
- Direcciones de wallet = datos públicos, OK guardarlas en claro.
- **RLS por `user_id`** en Supabase. `SERVICE_ROLE` y `THE_GRAPH_API_KEY` solo en el entorno del servidor.
- Auth del runner IA por `CLAUDE_CODE_OAUTH_TOKEN` (suscripción, sin API key). Ver `transversal/ia-runtime-headless.md`.
- `.env*` siempre ignorado por git.
