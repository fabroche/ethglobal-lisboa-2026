import { describe, it, expect, vi } from "vitest";
import { ensureAction } from "./ensure-action";

describe("ensureAction (precheck auto-creates; verify does not)", () => {
  it("POSTs the action to the app's precheck endpoint", async () => {
    const fetchFn = vi.fn(async () => new Response("{}"));
    await ensureAction("app_x", "seam-r_1-A", fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://developer.worldcoin.org/api/v1/precheck/app_x",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "seam-r_1-A", nullifier_hash: "" }),
      }),
    );
  });

  it("is fail-open: a precheck failure never throws (verify stays the fail-closed gate)", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(
      ensureAction("app_x", "seam-r_1-A", fetchFn as unknown as typeof fetch),
    ).resolves.toBeUndefined();
  });
});
