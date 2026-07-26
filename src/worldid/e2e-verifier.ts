import "server-only";
import { env } from "@/config/env";
import { cloudWorldVerifier } from "./cloud-verifier";
import type { WorldProof, WorldVerifier } from "./verify";

/**
 * Selects the World verifier for the write path (S3.4).
 *
 * Normally the real cloud verifier. ONLY when `E2E_FAKE_WORLD` is set (Playwright,
 * never production — env.ts refuses the combination) it returns a fake that accepts
 * the fixture proof and echoes its nullifier. The one-seat-per-(room, side) logic in
 * `claimSeat`/`reserveSeat` is UNCHANGED and still runs — the fake only stands in for
 * the human-driven proof a headless browser cannot produce, so the seat rule is still
 * exercised end to end.
 */
export function worldVerifierForRequest(): WorldVerifier {
  if (!env.E2E_FAKE_WORLD) return cloudWorldVerifier();

  console.warn("[worldid] E2E_FAKE_WORLD active — World proofs are NOT verified. Test only.");
  return {
    async verify(proof: WorldProof) {
      // The nullifier still varies per side (the fixture carries a distinct one),
      // so the seat registry's one-per-(room, side) rule is genuinely tested.
      return { success: true, nullifierHash: proof.nullifier_hash };
    },
  };
}
