# 00 · Visión y alcance

> **🟦 TENTATIVO — sujeto a decisión de idea.** La idea núcleo aún no está cerrada; ver
> `05-decisiones-abiertas.md`. Este documento describe la dirección recomendada
> ("Crypto Copilot / Contador On-Chain") como andamiaje, no como compromiso.

## Problema
La **contabilidad y el seguimiento de finanzas cripto** es doloroso y está poco resuelto. Los datos viven
**dispersos on-chain**: transacciones, swaps, posiciones DeFi y balances repartidos entre wallets, protocolos
y redes, sin un formato común ni un histórico legible. Calcular **PnL**, **base de costo** o un **reporte
fiscal** exige cruzar a mano exploradores de bloques, hojas de cálculo y precios históricos. Las
herramientas existentes son caras, cerradas, o no razonan en lenguaje natural sobre tu cartera.

## Visión
Un **agente IA que lee on-chain (solo lectura) y razona sobre finanzas cripto en lenguaje natural**, sin
escribir ni desplegar contratos. Conectas una wallet (o un nombre **ENS**), el agente lee sus posiciones y
movimientos vía **The Graph** y **viem**, calcula métricas financieras (con el criterio del socio contador)
y genera **borradores de reporte** —PnL, base de costo, ganancias realizadas/no realizadas, esbozo fiscal—
que puedes revisar y exportar. Es *home-os pero para cripto*: misma arquitectura (jobs + Postgres + IA que
razona), otro dominio.

## Objetivos
1. **Leer on-chain sin fricción** — conectar una wallet/ENS y traer posiciones y movimientos (read-only).
2. **PnL y base de costo** — calcular realizado/no realizado con criterio contable defendible.
3. **Reporte en lenguaje natural** — borradores fiscales/PnL que la IA redacta y el usuario revisa.
4. **IA con tu suscripción** — automatización con Claude Code headless, **sin coste de API**.
5. **Apilar premios** — un solo producto que encaja con **The Graph** + **ENS** (+ Hedera opcional).

## Alcance (hackathon, 36h)
**Dentro:** MVP **demo-able end-to-end** — leer una wallet real en **1 red** (p. ej. Ethereum mainnet vía
The Graph), calcular al menos **una métrica financiera estrella** (PnL realizado o base de costo) y generar
**un borrador de reporte** por IA; identidad de agente vía **ENS**; UI mínima mobile-first; **video demo**.
**Fuera (stretch / post-hackathon):** ejecución de swaps o rebalanceo (idea B), multi-chain, múltiples
jurisdicciones fiscales, Hedera, cómputo verificable (0G). Todo lo que implique **escribir on-chain** queda
**fuera** por diseño (D3/D4).

## Módulos (tentativos)
| ID | Módulo | Resumen |
|----|--------|---------|
| M1 | Ingesta on-chain | Leer wallets/posiciones/movimientos vía The Graph + viem (read-only) |
| M2 | Motor de PnL | Base de costo, realizado/no realizado; el socio contador define las reglas |
| M3 | Reportes IA | Borradores de reporte fiscal / PnL en lenguaje natural (IA headless) |
| M4 | Asistente IA | Cola `ai_jobs` + runner Claude Code headless + contratos de tarea (Zod) |
| M5 | MCP The Graph | Server/skill para consultar datos DeFi vía subgraphs — cimiento del resto |

## Métricas de éxito (hackathon)
- **Demo funcional end-to-end**: wallet real → PnL/base de costo → borrador de reporte, en vivo.
- **Apilar 2-3 premios** con un solo producto (objetivo: The Graph + ENS, Hedera opcional).
- **Video demo** grabado (requisito de varios sponsors).
- Riesgo web3 mínimo cumplido: **cero deploy de contratos, cero manejo de private keys**.
