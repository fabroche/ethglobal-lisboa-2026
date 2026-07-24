# Documentación técnica — ETHGlobal Lisboa 2026

Documentación de diseño **previa a la implementación** para la hackathon **ETHGlobal Lisbon 2026**
(36h). Proyecto de **finanzas cripto**: un agente IA que lee datos **on-chain** (solo lectura) y
razona sobre ellos en lenguaje natural, **sin escribir smart contracts**. Reutiliza la arquitectura
y el método de documentación de `home-os` (Next.js + Supabase + cola de jobs IA + Claude Code headless),
apuntada a lecturas on-chain vía **The Graph** y **viem**.

> **Nivel de detalle:** diseño para hackathon. El overview y los transversales están más cerrados;
> los **módulos son esbozos/plantillas** deliberadamente incompletos.

> **Estado (2026-07-24): FASE DE DECISIÓN DE IDEA.** La idea NO está cerrada. Todo el bloque de
> módulos está marcado **🟦 TENTATIVO — sujeto a decisión de idea**. La recomendación actual (a debatir
> con el socio, ver `00-overview/05-decisiones-abiertas.md`) es **"Crypto Copilot / Contador On-Chain"**:
> leer una wallet → calcular PnL/base de costo → generar borradores de reporte fiscal. El andamiaje de
> estos docs es **neutro**: orientado a esa idea pero fácil de pivotar.

## Organización (híbrido en 2 niveles)
- **GLOBAL** (`00-overview/`) — visión, arquitectura C4, **ER global** tentativo, **mapa de premios de sponsors**
  (doc estrella de la hackathon), convenciones y **decisiones abiertas**.
- **MÓDULO** (`modules/`) — un documento por módulo (todos tentativos), con una sección por funcionalidad.
- **TRANSVERSAL** (`transversal/`) — integraciones (The Graph, on-chain/viem/ENS), IA headless, infra/DevOps,
  diseño, **mobile-first**, calidad.
- **PLANTILLAS** (`_templates/`) — base para nuevos módulos y funcionalidades.

```
docs/
  README.md
  00-overview/{00-vision-y-alcance,01-arquitectura-c4,02-modelo-datos-global,03-mapa-premios-sponsors,04-convenciones,05-decisiones-abiertas}.md
  modules/{M1-ingesta-onchain,M2-motor-pnl,M3-reportes-ia,M4-asistente-ia,M5-mcp-thegraph}.md
  transversal/{integracion-thegraph,integracion-onchain,ia-runtime-headless,sistema-de-diseno,mobile-first,calidad-y-pruebas,infra-devops}.md
  _templates/{modulo,funcionalidad}.md
```

## Mapa de módulos (todos 🟦 TENTATIVOS)
| ID | Módulo | Estado |
|----|--------|:------:|
| M1 | Ingesta on-chain (leer wallets/posiciones · The Graph + viem, read-only) | 🟦 tentativo |
| M2 | Motor de PnL (base de costo, realizado/no realizado · manda el socio contador) | 🟦 tentativo |
| M3 | Reportes IA (borradores fiscales / PnL en lenguaje natural) | 🟦 tentativo |
| M4 | Asistente IA (cola `ai_jobs` + runner Claude Code headless + contratos Zod) | 🟦 tentativo |
| M5 | MCP The Graph (server/skill para consultar DeFi vía subgraphs — cimiento del resto) | 🟦 tentativo |
| T-TG | Integración The Graph (subgraphs/GraphQL + Subgraph MCP) | 🟧 borrador |
| T-OC | Integración on-chain (viem: ENS, balances, lectura ERC-20, read-only) | 🟧 borrador |
| T-IA | IA de runtime headless (Claude Code, sin API key) | 🟧 borrador |
| T-DS | Sistema de diseño | 🟧 borrador |
| T-MF | Mobile-first | 🟧 borrador |
| T-QA | Calidad y pruebas | 🟧 borrador |
| T-IN | Infra & DevOps (deploy por decidir) | 🟧 borrador |

## Ledger de decisiones de arquitectura
| # | Decisión | Detalle |
|---|----------|---------|
| D1 | Stack = Next.js 16 · React 19 · TS · Tailwind v4 · shadcn · Supabase | Reutilizado casi 1:1 de `home-os`. |
| D2 | **Monolingüe (español)** | Términos web3 (wallet, subgraph, swap, PnL, on-chain, MCP) en inglés por convención del ecosistema. |
| D3 | **Sin Solidity / sin smart contracts propios** | Se leen datos on-chain; **no se despliega nada**. Equipo con cero experiencia en Solidity. |
| D4 | **On-chain = SOLO LECTURA en el MVP** | Cero manejo de private keys; wallets **read-only**. No se firma ni envía ninguna transacción. |
| D5 | **Datos on-chain vía The Graph + viem** | The Graph (subgraphs/GraphQL + **Subgraph MCP**) para datos DeFi; **viem** (RPC público) para ENS y lecturas puntuales. |
| D6 | **IA de runtime = Claude Code headless** | Suscripción, **sin API key**. Cola `ai_jobs` + runner en el worker. Engine-agnóstico. |
| D7 | **Supabase (Postgres + Auth + RLS)** | Almacén/espejo/analítica de lo leído on-chain + cola de jobs. |
| D8 | **Sin Notion, sin correo, sin calendar** | A diferencia de `home-os`. No hay integración Notion/Gmail/IMAP/Calendar. |
| D9 | Diagramas en **Mermaid** | Embebidos, versionables por PR. |
| D10 | **date-fns** (no Moment) | Manejo de fechas de transacciones/timestamps on-chain. |
| D11 | **Deploy por decidir** | Vercel (rápido para hackathon) vs VPS Hostinger + Dokploy + Docker (como `home-os`). Ver `transversal/infra-devops.md`. |
| D12 | **Cadenas objetivo = empezar con 1 red** | P. ej. Ethereum mainnet vía The Graph. Multi-chain = stretch. Ver `05-decisiones-abiertas.md`. |
| D13 | **ENS para identidad de agente** | Premio de bajo riesgo web3 apilable sobre el núcleo (resolver nombre↔dirección con viem). |

## Estados de documento
`⬜ pendiente` → `🟧 borrador` → `🟨 en revisión` → `🟩 aprobado`
`🟦 tentativo` = sujeto a la **decisión de idea** de la hackathon (aún no comprometido).
