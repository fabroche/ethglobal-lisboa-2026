import "@/lib/server-guard";
import { GraphQLClient } from "graphql-request";
import { env, requireEnv } from "@/config/env";

/**
 * Capa de acceso a The Graph (subgraphs vía el gateway descentralizado).
 *
 * Reglas duras (ver docs/transversal/integracion-thegraph.md):
 * - SOLO LECTURA. Nunca claves privadas aquí.
 * - Validar SIEMPRE la respuesta con Zod en la capa `services` (no confiar en el shape).
 * - Paginar consultas grandes; añadir rate-limit + retry al implementar cada query.
 *
 * `subgraphId` es el ID de despliegue del subgraph en la red descentralizada.
 */
export function graphClient(subgraphId: string): GraphQLClient {
  const apiKey = requireEnv("THE_GRAPH_API_KEY");
  const url = `${env.THE_GRAPH_GATEWAY_URL}/${apiKey}/subgraphs/id/${subgraphId}`;
  return new GraphQLClient(url);
}

/**
 * Ejecuta una query GraphQL contra un subgraph. La validación del resultado
 * (Zod) va en la capa de dominio que llama a esta función.
 */
export async function querySubgraph<T>(
  subgraphId: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return graphClient(subgraphId).request<T>(query, variables);
}
