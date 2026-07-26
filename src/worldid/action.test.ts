import { describe, it, expect } from "vitest";
import { roomActionId } from "./action";

describe("roomActionId", () => {
  it("scopes the action to the room — not app-wide", () => {
    // App-wide would mean one use of Overlap ever, per person. People negotiate more than once.
    expect(roomActionId("r_9f3a")).toBe("overlap-r_9f3a");
  });

  it("does NOT encode the side (D17 — the hole that let one phone take both seats)", () => {
    // The nullifier is f(app_id, action, person). A per-side action gave the same human a
    // different valid nullifier for each side, so one phone could hold A and B. Both seats
    // must derive from ONE action for them to compete.
    const action = roomActionId("r_9f3a");
    expect(action).not.toMatch(/-[AB]$/u);
    expect(action.endsWith("r_9f3a")).toBe(true);
  });

  it("differs across rooms, so rooms stay unlinkable from each other", () => {
    expect(roomActionId("r_1")).not.toBe(roomActionId("r_2"));
  });

  it("is deterministic (client and server derive the same action)", () => {
    expect(roomActionId("r_9f3a")).toBe(roomActionId("r_9f3a"));
  });

  it("rejects an empty roomId", () => {
    expect(() => roomActionId("")).toThrow();
  });
});
