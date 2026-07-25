import { describe, it, expect, vi } from "vitest";
import { claimSeat } from "./claim";
import { initSeatRegistry, isSeatTaken } from "./seats";
import type { WorldProof, WorldVerifier } from "./verify";

const PROOF: WorldProof = {
  merkle_root: "0xroot",
  nullifier_hash: "0xnull_a",
  proof: "0xproof",
  verification_level: "orb",
};

function verifier(result: Awaited<ReturnType<WorldVerifier["verify"]>>): WorldVerifier & {
  calls: { action: string; appId: string }[];
} {
  const calls: { action: string; appId: string }[] = [];
  return {
    calls,
    async verify(_proof, ctx) {
      calls.push({ action: ctx.action, appId: ctx.appId });
      return result;
    },
  };
}

const APP = "app_123";

describe("claimSeat", () => {
  it("verifies with the per-room-per-side action and reserves the seat", async () => {
    const v = verifier({ success: true, nullifierHash: "0xnull_a" });
    const res = await claimSeat(
      { roomId: "r_1", side: "A", appId: APP, proof: PROOF },
      { verifier: v, seats: initSeatRegistry() },
    );

    expect(res.nullifierRef).toBe("0xnull_a");
    expect(isSeatTaken(res.seats, "r_1", "A")).toBe(true);
    expect(v.calls[0]).toEqual({ action: "overlap-r_1-A", appId: APP });
  });

  it("fails closed: a failed proof throws and reserves no seat", async () => {
    const v = verifier({ success: false, code: "invalid_proof" });
    const seats = initSeatRegistry();
    await expect(
      claimSeat({ roomId: "r_1", side: "A", appId: APP, proof: PROOF }, { verifier: v, seats }),
    ).rejects.toThrow(/Selfie Check failed/);
    expect(seats.claimed).toEqual({});
  });

  it("rejects a second claim on the same (room, side) even with a valid proof", async () => {
    const v = verifier({ success: true, nullifierHash: "0xnull_a" });
    const first = await claimSeat(
      { roomId: "r_1", side: "A", appId: APP, proof: PROOF },
      { verifier: v, seats: initSeatRegistry() },
    );
    await expect(
      claimSeat(
        { roomId: "r_1", side: "A", appId: APP, proof: { ...PROOF, nullifier_hash: "0xother" } },
        { verifier: v, seats: first.seats },
      ),
    ).rejects.toThrow(/already taken/);
  });

  it("rejects a malformed proof before calling the verifier", async () => {
    const v = verifier({ success: true, nullifierHash: "0xnull_a" });
    const spy = vi.spyOn(v, "verify");
    await expect(
      claimSeat(
        // @ts-expect-error — missing proof fields
        { roomId: "r_1", side: "A", appId: APP, proof: { nullifier_hash: "0xnull_a" } },
        { verifier: v, seats: initSeatRegistry() },
      ),
    ).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});
