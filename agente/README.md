# Banco de contexto — agentes (dev)

Referencia rápida para los subagentes. Lee el archivo relevante **antes** de trabajar en cada área.
La documentación exhaustiva está en `docs/`; aquí van chuletas y enrutado.

| Tema | Lee |
|------|-----|
| Visión, alcance, módulos | `docs/00-overview/00-vision-y-alcance.md` |
| Estrategia de premios (hackathon) | `docs/00-overview/03-mapa-premios-sponsors.md` |
| Arquitectura y capas | `docs/00-overview/01-arquitectura-c4.md` + `agente/stack.md` |
| Modelo de datos (ER tentativo) | `docs/00-overview/02-modelo-datos-global.md` |
| Convenciones de código | `docs/00-overview/04-convenciones.md` |
| **Reglas web3 (duras)** | `agente/reglas-web3.md` |
| The Graph (subgraphs + MCP) | `docs/transversal/integracion-thegraph.md` |
| On-chain (viem, ENS) | `docs/transversal/integracion-onchain.md` |
| IA runtime (headless) | `docs/transversal/ia-runtime-headless.md` + `agente/stack.md` |
| Diseño / UI | `docs/transversal/sistema-de-diseno.md` + `docs/transversal/mobile-first.md` |
| Calidad / tests | `docs/transversal/calidad-y-pruebas.md` |
| Infra / deploy | `docs/transversal/infra-devops.md` |
| Decisiones abiertas (idea) | `docs/00-overview/05-decisiones-abiertas.md` |

## Subagentes disponibles (`.claude/agents/`)
`frontend` · `backend` · `onchain-data` · `ia-agente` · `devops` · `qa-testing`

## Recordatorio de contexto
Primera hackathon ETH. **Sin Solidity, sin smart contracts propios.** On-chain = **solo lectura**.
La jugada: reusar la arquitectura de `home-os` apuntada a finanzas cripto. Idea **aún en decisión**
(ver `docs/00-overview/05-decisiones-abiertas.md`).
