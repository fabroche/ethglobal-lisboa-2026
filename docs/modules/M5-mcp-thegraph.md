# M5 · MCP The Graph

> **🟦 TENTATIVO — sujeto a decisión de idea.** Esbozo. Es la **idea C** de la `MEMORIA.md`: MCP server /
> skill para consultar datos DeFi vía The Graph. **Cimiento del resto** (M1–M4 se apoyan en él) y **apuesta
> segura** de premio (The Graph · Best AI Tooling). No compite con la idea A: la sostiene.

| Campo | Valor |
|-------|-------|
| **ID** | M5 |
| **Estado** | 🟦 tentativo |
| **Depende de** | The Graph (subgraphs / gateway), Claude Code (MCP) |
| **Lo usan** | M1 (ingesta), M4 (asistente), cualquier asistente IA externo |

## 1. Propósito y alcance
Un **MCP server / skill** que permite a un asistente IA (Claude Code) **consultar datos DeFi on-chain vía
The Graph** con queries GraphQL parametrizadas, paginadas y validadas. Reutilizable por el propio agente
(M4) y demostrable de forma independiente (premio The Graph AI Tooling). **Fuera de alcance:** escribir
on-chain; el MCP es de **solo lectura**.

## 2. Actores
Agente IA (Claude Code, consume el MCP) · The Graph gateway (fuente) · Desarrollador (configura `.mcp.json`).

## 3. Requisitos funcionales (RF)
| ID | Requisito | Prioridad |
|----|-----------|:---------:|
| RF-M5-001 | Exponer herramientas MCP para consultar subgraphs (query GraphQL parametrizada) | Must |
| RF-M5-002 | Paginación transparente (no truncar resultados) | Must |
| RF-M5-003 | Validar la respuesta (Zod) y devolver DTO limpio al agente | Should |
| RF-M5-004 | Configurable vía `.mcp.json` del repo (dev) | Should |

## 4. Requisitos no funcionales (RNF)
| ID | Requisito | Métrica / criterio |
|----|-----------|--------------------|
| RNF-M5-001 | Read-only | ninguna herramienta escribe on-chain |
| RNF-M5-002 | Robustez | rate-limit + retry ante límites del gateway |

## 5. Modelo de datos (fragmento del ER global)
_El MCP no persiste modelo propio; alimenta a M1, que espeja en `movimiento_onchain` / `snapshot_posicion`._

## 6. Arquitectura / componentes
Dos opciones (decisión abierta): **(a)** usar el **Subgraph MCP oficial de The Graph** (confirmar
nombre/paquete/endpoint en booth) configurado en `.mcp.json`; **(b)** un skill/wrapper propio sobre el
gateway GraphQL. Ver `transversal/integracion-thegraph.md`.

## 7. Funcionalidades
_A rellenar: F-M5-1 Query a subgraph · F-M5-2 Paginación · F-M5-3 Config `.mcp.json`._

## 8. Endpoints / Server Actions / Integraciones / Jobs
| Tipo | Nombre | Entrada | Salida | Auth | Notas |
|------|--------|---------|--------|------|-------|
| MCP tool | `query_subgraph` | `{ subgraph, query, vars }` | filas validadas | `THE_GRAPH_API_KEY` | paginado |

## 9. Componentes UI (Definition of Done)
_Sin UI propia (es tooling); se demuestra desde el agente / consola MCP._

## 10. Criterios de aceptación del módulo
- [ ] El agente obtiene, vía MCP, movimientos de una wallet real sin truncar.

## 11. DoD de cierre del módulo
_Ver plantilla `_templates/modulo.md` §11._

## 12. Riesgos y decisiones abiertas
- **Confirmar en booth/doc de The Graph** el nombre/paquete/endpoint exacto del Subgraph MCP.
- Qué subgraphs cubren mejor swaps/posiciones de la red elegida (DA3).
