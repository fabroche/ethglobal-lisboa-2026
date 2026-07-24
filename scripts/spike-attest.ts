/**
 * FRIDAY-NIGHT SPIKE (backlog S0.3) — the whole gamble.
 *
 * Goal: make ONE sealed 0G inference call and verify the TEE attestation
 * signature INDEPENDENTLY (outside the 0G SDK). If this holds, the project is
 * possible. If it doesn't, we need to know tonight, not Sunday.
 *
 * Steps to implement:
 *   1. Call the 0G router (OpenAI-compatible) with a pinned model, temp 0.
 *   2. Download the attestation + response signature from the provider endpoint.
 *   3. Verify the signature against OG_ENCLAVE_PUBKEY (verifyEnvelope helper —
 *      confirm the exact package/endpoint at the 0G booth).
 *   4. Print PASS/FAIL. Tamper one byte and confirm it FAILS (fail closed).
 *
 * Run: npm run spike
 */
import { env } from "../src/config/env";

async function main(): Promise<void> {
  console.warn("[spike] 0G attestation spike — not implemented yet (S0.3).");
  console.warn(`[spike] router=${env.OG_ROUTER_URL} model=${env.OG_MODEL ?? "(unset)"}`);
  // TODO(S0.3): sealed call → download attestation → verifyEnvelope → PASS/FAIL.
  throw new Error("spike-attest not implemented — implement S0.3 first (Friday night).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
