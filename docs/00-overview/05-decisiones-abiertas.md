# 05 · Decisiones abiertas

Doc **vivo** para debatir con el socio antes y durante la hackathon. Recoge las decisiones sin cerrar de la
`MEMORIA.md`. Cada una con opciones y un **voto tentativo** (no vinculante). Estado global: **🟦 en decisión.**

> Cuando una decisión se cierre, moverla al ledger de `README.md` (Dxx) o al doc del módulo/transversal
> correspondiente, y marcarla 🟩 aquí.

## Tabla de decisiones
| # | Decisión | Opciones | Voto tentativo | Estado |
|---|----------|----------|----------------|:------:|
| DA1 | **Alcance del MVP** | (a) solo "leer wallet → PnL + reporte" (idea A núcleo) · (b) también ejecución de swaps/rebalanceo (idea B) | **(a) núcleo primero**; ejecución = stretch. Menor riesgo web3, demo segura. | 🟦 |
| DA2 | **Reporte financiero "wow"** | (a) PnL realizado · (b) informe fiscal por jurisdicción · (c) análisis de riesgo de cartera | Input del **socio contador**. Tentativo: (a) PnL realizado como base, (b) fiscal como diferenciador. | 🟦 |
| DA3 | **Cadenas objetivo** | (a) 1 red (Ethereum mainnet vía The Graph) · (b) multi-chain | **(a) 1 red** para el MVP; multi-chain = stretch. | 🟦 |
| DA4 | **¿Metemos Hedera?** | (a) sí (apila premio ~$15k) · (b) no (menos superficie) | **(b) no en el núcleo**; evaluar como stretch si sobra tiempo (testnet + SDK suman superficie). | 🟦 |
| DA5 | **Reparto de roles** | — | Yo → arquitectura, agente IA, MCP, front. Socio → métricas financieras, validación de números, pitch/demo. | 🟦 |
| DA6 | **Fuente de precios históricos** | (a) del propio subgraph · (b) oráculo on-chain · (c) API de precios externa | *Sin voto* — depende de qué exponga el subgraph elegido. Confirmar en booth de The Graph. | 🟦 |
| DA7 | **Deploy** | (a) Vercel (rápido para hackathon) · (b) VPS Hostinger + Dokploy + Docker (como home-os) | Tentativo: **(a) Vercel** para la app por velocidad; el worker/runner IA quizá en local. Ver `transversal/infra-devops.md`. | 🟦 |
| DA8 | **Identidad ENS: ¿usuario o agente?** | (a) resolver el ENS del usuario/wallet · (b) darle un nombre ENS al agente | Ambas son baratas; empezar por (a) resolver, evaluar (b) para el premio ENS. | 🟦 |

## Notas
- **DA1 y DA2 son las decisivas**: definen el núcleo demostrable y el diferenciador. Cerrarlas primero.
- Ninguna decisión aquí compromete Solidity/escritura on-chain (eso está cerrado en negativo: D3/D4 del `README.md`).
- Los **montos de premios son aproximados**; reconfirmar en booths (ver `03-mapa-premios-sponsors.md`).
