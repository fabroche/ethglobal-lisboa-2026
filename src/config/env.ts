import { z } from "zod";

/**
 * Environment validation (fail-fast) with Zod. Validated ONCE, here.
 * Never read `process.env.X ?? ""` scattered around the code.
 *
 * Integrations are `optional()` so the scaffold compiles and boots without
 * credentials; each module hardens (`.min(1)`) what it needs, or uses `requireEnv()`.
 */
const envSchema = z.object({
  // App
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // 0G — sealed inference (OpenAI-compatible router + independent attestation check)
  OG_ROUTER_URL: z.string().url().default("https://router-api.0g.ai/v1"),
  OG_KEY: z.string().optional(),
  OG_MODEL: z.string().optional(), // pin an exact model, record its hash
  OG_ENCLAVE_PUBKEY: z.string().optional(), // for independent attestation verification
  OG_ENCLAVE_SEAL_PUBKEY: z.string().optional(), // enclave ENCRYPTION key for client sealing (spec-04 §2) — distinct from the attestation key above

  // Hedera — HCS topic (registry) + Schedule Service (clock) + Mirror Node (read)
  HEDERA_ACCOUNT_ID: z.string().optional(),
  HEDERA_PRIVATE_KEY: z.string().optional(), // our testnet account only — never a user's
  HEDERA_TOPIC_ID: z.string().optional(), // created once
  HEDERA_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),

  // World — Selfie Check (one seat per room per side)
  WORLD_APP_ID: z.string().optional(),
  WORLD_ACTION: z.string().optional(), // scoped per room at runtime
});

// Treat empty strings ("") as absent so empty .env.example placeholders don't
// break optional-field validation.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check .env.local (see .env.example).");
}

export const env = parsed.data;
export type Env = typeof env;

/** Require an optional variable to be present (use in modules that need it). */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${String(key)} (see .env.example).`);
  }
  return value as NonNullable<Env[K]>;
}
