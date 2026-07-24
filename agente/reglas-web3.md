# Reglas web3 (duras)

> El guardián de que no nos metamos en líos que no sabemos resolver (primera hackathon ETH, cero Solidity).

## Lo que SÍ hacemos
- **Leer** datos on-chain: subgraphs de **The Graph** (GraphQL) y **viem** (RPC: ENS, balances, `view`/`read` de ERC-20).
- Razonar sobre esos datos con IA (PnL, base de costo, reportes) — todo off-chain.
- Identidad de agentes con **ENS** (resolución de nombres) para apilar premio.

## Lo que NO hacemos (líneas rojas)
- ❌ **Solidity / smart contracts propios**. Cero deploy.
- ❌ **Firmar o enviar transacciones** on-chain en el MVP. Nada de mover fondos.
- ❌ **Manejar private keys / seed phrases**. Jamás en el repo, en `.env`, ni en el front.
- ❌ Lenguaje Move (Sui), hooks de AMM, opcodes (1inch/SwapVM): fuera de alcance por riesgo.

## Higiene
- Las **direcciones de wallet son públicas** → OK guardarlas y mostrarlas.
- Validar con **Zod** el shape de toda respuesta externa antes de usarla.
- **Paginar** siempre las queries de The Graph; añadir **rate-limit + retry**.
- API keys (The Graph, RPC) solo en el servidor/worker, vía `src/config/env.ts`.

## Regla de oro del mapa de premios
Leer datos (subgraphs/APIs) = **fácil** · usar SDK que abstrae contratos = **medio** ·
escribir/deployar contratos = **caro**. Nos quedamos en "fácil" y, si sobra tiempo, "medio".
Ver `docs/00-overview/03-mapa-premios-sponsors.md`.
