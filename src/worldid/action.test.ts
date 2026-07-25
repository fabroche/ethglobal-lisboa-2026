import { describe, it, expect } from "vitest";
import { roomActionId } from "./action";

describe("roomActionId", () => {
  it("scopes the action to room AND side (not app-wide)", () => {
    expect(roomActionId("r_9f3a", "A")).toBe("overlap-r_9f3a-A");
    expect(roomActionId("r_9f3a", "B")).toBe("overlap-r_9f3a-B");
  });

  it("differs across rooms and across sides", () => {
    const a1 = roomActionId("r_1", "A");
    const a2 = roomActionId("r_2", "A");
    const b1 = roomActionId("r_1", "B");
    expect(new Set([a1, a2, b1]).size).toBe(3);
  });

  it("is deterministic (client and server derive the same action)", () => {
    expect(roomActionId("r_9f3a", "A")).toBe(roomActionId("r_9f3a", "A"));
  });

  it("rejects an empty roomId and an invalid side", () => {
    expect(() => roomActionId("", "A")).toThrow();
    // @ts-expect-error — "C" is not a valid side
    expect(() => roomActionId("r_1", "C")).toThrow();
  });
});
