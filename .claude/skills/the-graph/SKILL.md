---
name: the-graph
description: Consultar datos on-chain con The Graph (subgraphs vía GraphQL + gateway) y el Subgraph MCP en este proyecto. Úsala al escribir queries a subgraphs, elegir subgraph, paginar, o configurar/usar el MCP de The Graph. Sponsor clave de la hackathon.
---

# The Graph — consultar datos on-chain

Sponsor **clave** de la hackathon (AI Use Case + AI Tooling/MCP). Todo es **lectura**.

## Dos vías

1. **En la app** (`src/lib/onchain/thegraph.ts`): `graphql-request` contra el gateway
   descentralizado. Necesita `THE_GRAPH_API_KEY` (Subgraph Studio → API Keys).
   URL: `${THE_GRAPH_GATEWAY_URL}/${API_KEY}/subgraphs/id/${SUBGRAPH_ID}`.

2. **Explorar/consultar con Claude Code**: el **Subgraph MCP** (configurado en `.mcp.json`).
   > ⚠️ El nombre exacto del paquete/endpoint del MCP de The Graph puede cambiar: confírmalo en
   > la doc oficial (thegraph.com/docs) o en el **booth** del evento, y ajusta `.mcp.json`.
   > Requiere `THE_GRAPH_API_KEY` en el entorno.

## Reglas duras (ver `agente/reglas-web3.md`)
- **Paginar siempre** (`first`/`skip` o cursores). Los subgraphs limitan el tamaño de página (~1000).
- **Validar el shape con Zod** en `lib/services` antes de usar el resultado. Nada de `as any`.
- Rate-limit + retry en consultas repetidas.
- La API key va SOLO en servidor/worker, vía `src/config/env.ts`. Nunca en el cliente.

## Ejemplo de query paginada (patrón)

```graphql
query Swaps($owner: Bytes!, $first: Int!, $skip: Int!) {
  swaps(
    where: { origin: $owner }
    orderBy: timestamp
    orderDirection: desc
    first: $first
    skip: $skip
  ) {
    id
    timestamp
    amountUSD
  }
}
```

## Pasos típicos
1. Encontrar el **subgraph** correcto (The Graph Explorer) y copiar su **deployment ID**.
2. Escribir la query mínima que responda la pregunta de producto (PnL, movimientos, posiciones).
3. Paginar hasta agotar; acumular; validar con Zod; pasar a `lib/services`.
4. Cachear/espejar en Supabase si la query es cara o se repite.

## Antes de arrancar en el evento
Habla con los mentores de **The Graph** en su booth: qué subgraphs recomiendan para el caso,
y confirma el estado del **Subgraph MCP** y los requisitos del premio.
