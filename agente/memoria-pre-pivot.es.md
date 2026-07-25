>  ⚠️ **DOCUMENTO HISTÓRICO — PRE-PIVOT. No describe el producto actual.**
>
>  Escrito el 2026-07-24, **antes** de que el equipo llegara a Seam. Recomienda "Idea A — Crypto
>  Copilot", que fue descartada. Se conserva porque es el registro de cómo se eligió: la comparación
>  de premios, el test de "cada sponsor debe ser imprescindible" y las ideas que se mataron. Movido de
>  la raíz a `agente/` en S4.7 para que nadie lo lea como vigente.
>
>  El producto actual es **Seam** → `CLAUDE.md`, `docs/README.md`, `docs/idea-brainstorm.md`.
>  Está en español a propósito (excepción a D2, como los espejos de `docs/ux/`).

# ETHGlobal Lisboa 2026 — Memoria del proyecto

> Documento de contexto para la hackathon. Registra lo conversado y decidido hasta ahora.
> Última actualización: 2026-07-24

---

## 1. Contexto del equipo

- **Yo (fabroche):** programador fullstack senior con mucha experiencia en **web2** y **nula en web3**. Es mi primera hackathon de ETH.
- **Mi socio:** trader con **5+ años en cripto**, además **contador** con fuerte base en finanzas.
- **Complemento del equipo:** yo aporto ingeniería/IA/fullstack; él aporta dominio financiero, estrategia cripto y contabilidad.

### Mi stack (basado en el proyecto home-os)
- **Front:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Storybook, Vitest.
- **Back/runtime:** Next.js server actions + API routes; **cola de jobs async (`ai_jobs`)** con worker separado.
- **IA:** **Claude Code headless (con MCP + SKILLs)** ya en producción.
- **Datos:** Supabase (Postgres) + Notion API (source of truth) + auth con magic links (RLS single-user).
- **Infra:** VPS Hostinger, Dokploy + Docker, Traefik, npm.
- **Insight clave:** home-os **ya es la arquitectura de un agente IA** (jobs + Postgres + IA que razona). La jugada es reusarla apuntada a finanzas cripto, **no aprender Solidity en 36 h**.

---

## 2. La hackathon

- **Evento:** ETHGlobal Lisbon 2026 — https://ethglobal.com/events/lisbon2026/prizes
- **Cagnotte total sponsors:** ~$83,000 · 8 sponsors.
- **Restricción autoimpuesta:** evitar Solidity / smart contracts (0 experiencia en web3).

### Mapa de premios por dificultad web3 (cifras aproximadas — reconfirmar en booths)

| Sponsor | Pista que nos sirve | Premio | Riesgo web3 |
|---|---|---|---|
| **The Graph** | AI Tooling (MCP/SKILL) + AI Use Case (agente lee datos on-chain) | $15k | 🟢 Bajo |
| **Hedera** | "No Solidity Allowed" + pagos con agentes IA (solo SDK) | $15k | 🟢 Bajo |
| **ENS** | Identidad para agentes IA (ideal para *apilar*) | $5k | 🟢 Bajo |
| **Uniswap** | Best API Integration (API normal, no hooks) | $10k | 🟡 Medio |
| **World** | AgentKit / verificación humano-vs-bot | $15k | 🟡 Medio |
| **0G** | AI Product con cómputo verificable (más nuevo) | $15k | 🟡 Medio |
| **1inch** | Aqua/SwapVM opcodes | $7k | 🔴 Alto |
| **Sui** | Apps en lenguaje Move | $6k | 🔴 Alto |

**Regla de oro:** leer datos (subgraphs/APIs) = fácil · usar SDK que abstrae contratos (Hedera, Uniswap API) = medio · escribir/deployar contratos (Solidity, Move, opcodes) = caro.

---

## 3. Ideas de MVP (todas reusan el stack y apilan premios)

### 💡 A — Crypto Copilot / "Contador On-Chain" ⭐ RECOMENDADA
Agente IA que conecta una wallet (solo lectura), lee posiciones DeFi en vivo y genera **PnL, base de costo, ganancias realizadas/no realizadas y borradores de reporte fiscal** en lenguaje natural.
- **Por qué gana:** es *home-os pero para cripto*. Casi nadie hackea un "contador cripto"; el socio **es contador con 5 años de mercado** → diferenciación insuperable.
- **Premios que apila:** The Graph (AI Use Case + AI Tooling/MCP), ENS (agent ID), Hedera (opcional).
- **Riesgo web3:** 🟢 bajo (core 100% lectura, cero deploy). Reuso de stack ~90%.

### 💡 B — Estratega DCA / Rebalanceo por lenguaje natural
Escribes *"mete 100€ en ETH cada semana y rebalancea si BTC cae 10%"* y el agente lo ejecuta.
- **Edge del socio:** él diseña la lógica de estrategia.
- **Premios:** Uniswap API + The Graph + Hedera Scheduled.
- **Riesgo web3:** 🟡 medio (ejecuta swaps reales → manejo de wallet/keys).

### 💡 C — MCP server de datos DeFi (apuesta segura)
MCP server / SKILL pulido para que cualquier asistente IA consulte datos DeFi vía The Graph.
- **Premios:** The Graph · Best AI Tooling ($3k).
- **Riesgo web3:** 🟢 bajo. **No compite con A: es su cimiento.**

### 💡 D — Hedera "No Solidity" puro
App SDK-only con 2+ servicios de Hedera (tokens + agente de pagos), sin Solidity.
- **Premios:** Hedera · No Solidity + Agentic Payments.
- **Riesgo web3:** 🟢 bajo (requiere testnet + aprender SDK). Temáticamente más flojo que A.

---

## 4. Recomendación actual

**Idea A como núcleo, construida sobre la C, apilando ENS.**
Reusa el stack casi 1:1, explota el edge del socio contador (dolor real y poco hackeado), evita Solidity, y toca 2–3 sponsors con un solo producto. Riesgo web3 mínimo = MVP terminado y demo funcional, que es lo que gana una primera hackathon.

---

## 5. Decisiones abiertas (para debatir con el socio)

1. **Alcance del MVP:** ¿solo "leer wallet → PnL + reporte" (A núcleo) o también ejecución (B)? Voto: núcleo primero, ejecución como stretch.
2. **Reporte financiero "wow":** ¿PnL realizado, informe fiscal por jurisdicción, o análisis de riesgo de cartera? (input del socio contador).
3. **Cadenas objetivo:** empezar con 1 red (p. ej. Ethereum mainnet vía The Graph).
4. **¿Metemos Hedera?** Apila premio pero suma superficie (testnet + SDK).
5. **Roles:** yo → arquitectura, agente IA, MCP, front. Socio → métricas financieras, validación de números, pitch/demo.

---

## 6. Próximos pasos

**Antes de la hackathon**
- [ ] Cerrar idea y alcance (este doc)
- [ ] Sacar API keys: The Graph, ENS, (Hedera testnet)
- [ ] Probar el Subgraph MCP con Claude Code
- [ ] Socio: definir las 2–3 métricas estrella del reporte

**Primeras horas del evento**
- [ ] Hablar con mentores de The Graph y ENS en booths
- [ ] Esqueleto Next.js + conexión de datos on-chain reales
- [ ] Demo mínima end-to-end lo antes posible
- [ ] Grabar video demo (requisito de varios sponsors)

---

## 7. Entregables generados

- `docs/ETHGlobal-Lisbon2026-Brainstorm-MVP.pdf` (ES) — en `~/Downloads`
- `docs/ETHGlobal-Lisbonne2026-Brainstorming-MVP-FR.pdf` (FR) — en `~/Downloads`
  > Ambos con estética tipo home-os + paleta ETHGlobal (temporal).

---

## Notas
- Montos de premios **aproximados** (extraídos del sitio); reconfirmar en booths/docs.
- Términos web3 (wallet, swaps, subgraphs, MCP) se dejan en inglés por convención del ecosistema.
