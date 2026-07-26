import { describe, it, expect, vi } from "vitest";
import { cloudWorldVerifier } from "./cloud-verifier";
import type { WorldProof } from "./verify";

const PROOF: WorldProof = {
  merkle_root: "0xroot",
  nullifier_hash: "0xnull",
  proof: "0xproof",
  verification_level: "device",
};

function fetchReturning(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("cloudWorldVerifier (v4 endpoint, legacy v3.0 proof shape)", () => {
  it("POSTs the legacy-shaped request to /api/v4/verify/{appId}", async () => {
    const fetchFn = fetchReturning(200, { success: true, nullifier: "123" });
    await cloudWorldVerifier(fetchFn as unknown as typeof fetch).verify(PROOF, {
      appId: "app_x",
      action: "overlap-r_1-A",
    });
    const [url, init] = fetchFn.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://developer.worldcoin.org/api/v4/verify/app_x");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      protocol_version: "3.0",
      action: "overlap-r_1-A",
      responses: [
        {
          identifier: "device",
          merkle_root: "0xroot",
          nullifier: "0xnull",
          proof: "0xproof",
        },
      ],
    });
    expect(body.nonce).toBeTruthy();
  });

  it("returns the verified nullifier on success", async () => {
    const fetchFn = fetchReturning(200, { success: true, nullifier: "42" });
    const result = await cloudWorldVerifier(fetchFn as unknown as typeof fetch).verify(PROOF, {
      appId: "app_x",
      action: "a",
    });
    expect(result).toEqual({ success: true, nullifierHash: "42" });
  });

  it("falls back to the proof's own nullifier when the response omits it", async () => {
    const fetchFn = fetchReturning(200, { success: true });
    const result = await cloudWorldVerifier(fetchFn as unknown as typeof fetch).verify(PROOF, {
      appId: "app_x",
      action: "a",
    });
    expect(result.nullifierHash).toBe("0xnull");
  });

  it("surfaces the per-credential rejection code and detail (fail closed upstream)", async () => {
    const fetchFn = fetchReturning(400, {
      success: false,
      code: "all_verifications_failed",
      results: [{ code: "invalid_proof", detail: "proof invalid" }],
    });
    const result = await cloudWorldVerifier(fetchFn as unknown as typeof fetch).verify(PROOF, {
      appId: "app_x",
      action: "a",
    });
    expect(result).toEqual({ success: false, code: "invalid_proof", detail: "proof invalid" });
  });

  it("handles a non-JSON response without throwing", async () => {
    const fetchFn = vi.fn(async () => new Response("<html>gateway error</html>", { status: 502 }));
    const result = await cloudWorldVerifier(fetchFn as unknown as typeof fetch).verify(PROOF, {
      appId: "app_x",
      action: "a",
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("bad_response");
  });
});
