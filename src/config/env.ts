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

  // 0G — sealed inference (OpenAI-compatible router + independent attestation check).
  // MAINNET by default (DA8): 0G testnet has no TeeML chat model, so the sealed
  // evaluation cannot run there. Hedera stays on testnet — separate networks.
  OG_ROUTER_URL: z.string().url().default("https://router-api.0g.ai/v1"),
  OG_KEY: z.string().optional(), // Trust mode MUST be `Private` (TEE enclave)
  // Pinned model (DA6). Single-provider on purpose so the enclave signing key
  // cannot rotate out from under OG_ENCLAVE_PUBKEY.
  OG_MODEL: z.string().optional(),
  OG_ENCLAVE_PUBKEY: z.string().optional(), // signing key — verifies the attestation (M7)
  // Enclave ENCRYPTION key for client sealing (spec-04 §2, M2) — distinct from
  // the attestation key above: you cannot encrypt to a 20-byte signer address.
  OG_ENCLAVE_SEAL_PUBKEY: z.string().optional(),
  // The private half of OG_ENCLAVE_SEAL_PUBKEY, for the DEMO sealing path (S2.9).
  //
  // This exists because there is no 0G enclave encryption key to seal to (D-M6-2): the
  // router is a chat API, so it cannot run our ECIES decryption inside the enclave. The
  // server therefore unseals here, immediately before the enclave call. That is a real
  // boundary and the demo says so out loud — with this set, "plaintext exists only inside
  // the TEE" is NOT true of this build.
  OG_DEMO_SEAL_SECRET: z.string().optional(),
  // OUR operating wallet, never a user's (see agente/guardrails.md). Needed
  // because the Router never makes us the broker's customer, so it cannot give
  // us a signature to verify — the whole product rests on getting one.
  OG_WALLET_PRIVATE_KEY: z.string().optional(),

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
