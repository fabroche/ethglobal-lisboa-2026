import { z } from "zod";
import type { WorldProof, WorldVerifier } from "./verify";

/**
 * The real World cloud verifier — now a plain fetch to the **v4** verify endpoint.
 *
 * Root-caused live (Sat night): our app is a new-generation portal app whose actions are
 * INVISIBLE to the legacy `/api/v2/verify` that idkit v2's `verifyCloudProof` calls — every
 * verification died with `invalid_action` ("Action not found"), even for actions created by
 * hand in the portal. The `/api/v4/verify/{app_id}` endpoint sees them, accepts legacy v3.0
 * proofs (what our v2 widget produces), and **auto-creates unknown actions** — so per-room
 * actions (`overlap-<roomId>-<side>`) need no pre-registration anywhere.
 *
 * Probe trail: garbage proof → v2 says "Action not found"; same action on v4 says
 * "proof improperly formatted" — i.e. v4 reached cryptographic validation. That error
 * boundary is the whole diagnosis.
 */
const V4_VERIFY = "https://developer.worldcoin.org/api/v4/verify";

const v4ResponseSchema = z.object({
  success: z.boolean(),
  nullifier: z.string().optional(),
  code: z.string().optional(),
  detail: z.string().optional(),
  results: z
    .array(z.object({ code: z.string().optional(), detail: z.string().optional() }))
    .optional(),
});

export function cloudWorldVerifier(fetchFn: typeof fetch = fetch): WorldVerifier {
  return {
    async verify(proof: WorldProof, { appId, action }) {
      const res = await fetchFn(`${V4_VERIFY}/${appId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol_version: "3.0",
          nonce: crypto.randomUUID(),
          action,
          responses: [
            {
              identifier: proof.verification_level,
              merkle_root: proof.merkle_root,
              nullifier: proof.nullifier_hash,
              proof: proof.proof,
            },
          ],
        }),
      });

      const body = v4ResponseSchema.safeParse(await res.json().catch(() => ({})));
      if (!body.success) {
        console.warn("[worldid] v4 verify: unparseable response", res.status);
        return { success: false, code: "bad_response", detail: `HTTP ${res.status}` };
      }

      if (body.data.success) {
        // v4 echoes the verified nullifier; fall back to the proof's own on older shapes.
        return { success: true, nullifierHash: body.data.nullifier ?? proof.nullifier_hash };
      }

      const code = body.data.results?.[0]?.code ?? body.data.code;
      const detail = body.data.results?.[0]?.detail ?? body.data.detail;
      console.warn("[worldid] v4 verify rejected:", code, detail);
      return { success: false, code, detail };
    },
  };
}
