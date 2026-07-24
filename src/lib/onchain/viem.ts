import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { env } from "@/config/env";

/**
 * Cliente público de viem (SOLO LECTURA): ENS, balances, lecturas de contratos.
 * No maneja claves privadas ni firma transacciones (regla del MVP: cero escritura on-chain).
 */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(env.ETHEREUM_RPC_URL),
});

/** Resuelve un nombre ENS (p. ej. `vitalik.eth`) a su dirección. */
export async function resolveEns(name: string): Promise<Address | null> {
  return publicClient.getEnsAddress({ name: normalize(name) });
}

/** Resuelve una dirección a su nombre ENS primario (reverse lookup). */
export async function lookupEns(address: Address): Promise<string | null> {
  return publicClient.getEnsName({ address });
}
