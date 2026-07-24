import { z } from "zod";

/**
 * The World Selfie Check verification boundary (M3). Verification runs **server-side** and
 * **fails closed** — no valid proof, no seat (RF-M3, D7). The actual cloud call lives behind
 * this narrow port (`cloud-verifier.ts`), so the seat logic is unit-testable with a fake and
 * `@worldcoin/idkit` is never pulled into this module or its tests.
 *
 * We only ever handle the opaque `nullifier_hash` — never any identity (RNF-M3-002).
 */

/** The success payload the World widget returns to us. */
export const worldProofSchema = z.object({
  merkle_root: z.string().min(1),
  nullifier_hash: z.string().min(1),
  proof: z.string().min(1),
  verification_level: z.string().min(1),
});
export type WorldProof = z.infer<typeof worldProofSchema>;

export interface WorldVerifyResult {
  success: boolean;
  /** The opaque nullifier for this `(app, action, person)` — present only on success. */
  nullifierHash?: string;
  code?: string;
  detail?: string;
}

export interface WorldVerifier {
  verify(
    proof: WorldProof,
    ctx: { appId: string; action: string; signal?: string },
  ): Promise<WorldVerifyResult>;
}
