import { z } from "zod";

/**
 * Validación de variables de entorno (fail-fast) con Zod.
 *
 * Se valida UNA vez, aquí. Nunca leer `process.env.X ?? ""` disperso por el código
 * (anti-patrón heredado de home-os: clientes construidos con strings vacíos que
 * fallan en runtime de forma silenciosa).
 *
 * Las integraciones son `optional()` para que el scaffold compile y arranque sin
 * credenciales; cada módulo, al implementarse, endurece (`.min(1)`) lo que necesita
 * o usa `requireEnv()`.
 */
const envSchema = z.object({
  // App
  APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().optional(),
  SIGNUP_CODE: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),

  // The Graph (datos on-chain vía subgraphs)
  THE_GRAPH_API_KEY: z.string().optional(),
  THE_GRAPH_GATEWAY_URL: z.string().url().default("https://gateway.thegraph.com/api"),

  // RPC on-chain (viem: ENS, balances, lecturas ERC-20) — SOLO LECTURA
  ETHEREUM_RPC_URL: z.string().url().default("https://eth.llamarpc.com"),

  // IA de runtime — Claude Code headless (suscripción, sin API key)
  CLAUDE_CLI_PATH: z.string().default("claude"),
  CLAUDE_WORKDIR: z.string().default("./worker/agent"),
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
  AI_POLL_MS: z.coerce.number().int().positive().default(3000),
});

// Trata las variables vacías ("") como ausentes, para que los placeholders
// vacíos de .env.example no rompan la validación de campos opcionales.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuración de entorno inválida. Revisa .env.local (ver .env.example).");
}

export const env = parsed.data;
export type Env = typeof env;

/** Exige que una variable opcional esté presente (usar en los módulos que la necesiten). */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Falta la variable de entorno requerida: ${String(key)} (ver .env.example).`);
  }
  return value as NonNullable<Env[K]>;
}
