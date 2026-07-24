import { describe, it, expect, vi } from "vitest";
import { createRoom, type RegistryPort, type CreateRoomDeps } from "./session";
import type { ExpiryMessage } from "./messages";

function fakeRegistry(): RegistryPort & { calls: ExpiryMessage[] } {
  const calls: ExpiryMessage[] = [];
  return {
    calls,
    async publishExpiry(message) {
      calls.push(message);
      return { topicId: "0.0.1234", sequenceNumber: 1 };
    },
  };
}

function deps(over: Partial<CreateRoomDeps> = {}): CreateRoomDeps {
  return {
    registry: fakeRegistry(),
    baseUrl: "https://seam.app",
    now: () => new Date("2026-07-26T06:00:00Z"),
    newRoomId: () => "9f3a",
    ...over,
  };
}

const VALID = { deadlineIso: "2026-07-26T09:00:00Z" } as const;

describe("createRoom", () => {
  it("publishes the expiry then returns a room with per-side join links", async () => {
    const d = deps();
    const room = await createRoom(VALID, d);

    expect(room.roomId).toBe("r_9f3a");
    expect(room.topicId).toBe("0.0.1234");
    expect(room.expirySeq).toBe(1);
    expect(room.joinUrls.A).toContain("side=A");
    expect(room.joinUrls.B).toContain("side=B");
    expect(room.joinUrls.A).toContain("/room/r_9f3a");
  });

  it("writes the expiry with the injected clock as createdAt (no hidden Date.now)", async () => {
    const registry = fakeRegistry();
    await createRoom(VALID, deps({ registry }));
    expect(registry.calls).toHaveLength(1);
    expect(registry.calls[0]).toMatchObject({
      type: "expiry",
      roomId: "r_9f3a",
      deadline: "2026-07-26T09:00:00Z",
      createdAt: "2026-07-26T06:00:00.000Z",
    });
  });

  it("does NOT publish anything when the deadline is in the past (fail before side effects)", async () => {
    const registry = fakeRegistry();
    const spy = vi.spyOn(registry, "publishExpiry");
    await expect(
      createRoom({ deadlineIso: "2026-07-26T05:00:00Z" }, deps({ registry })),
    ).rejects.toThrow(/future/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects malformed input before publishing", async () => {
    const registry = fakeRegistry();
    const spy = vi.spyOn(registry, "publishExpiry");
    await expect(
      createRoom({ deadlineIso: "whenever" }, deps({ registry })),
    ).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});
