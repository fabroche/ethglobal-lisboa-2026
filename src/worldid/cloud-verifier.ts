import { verifyCloudProof, type ISuccessResult } from "idkit2";
import type { WorldProof, WorldVerifier } from "./verify";
import { ensureAction } from "./ensure-action";

/**
 * The real World cloud verifier — the ONLY module that imports `@worldcoin/idkit`. Isolated
 * here (like the Hedera SDK boundary) so the seat logic and its tests never pull the widget
 * bundle. Runs server-side; `verifyCloudProof` calls the World developer API.
 */
export function cloudWorldVerifier(): WorldVerifier {
  return {
    async verify(proof: WorldProof, { appId, action, signal }) {
      // Per-room actions only auto-create via precheck; /verify rejects unknown actions
      // with invalid_action. Close the race before verifying (see ensure-action.ts).
      await ensureAction(appId, action);
      const result = await verifyCloudProof(
        proof as ISuccessResult,
        appId as `app_${string}`,
        action,
        signal,
      );
      if (result.success) {
        return { success: true, nullifierHash: proof.nullifier_hash };
      }
      return { success: false, code: result.code, detail: result.detail };
    },
  };
}
