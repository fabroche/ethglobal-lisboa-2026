import { describe, it, expect } from "vitest";
import {
  initCommitmentState,
  acceptCommitment,
  isRoomComplete,
} from "./commitments";

describe("commitment gate", () => {
  it("rejects any commitment before the expiry is published (ordering invariant)", () => {
    const state = initCommitmentState(false);
    expect(() => acceptCommitment(state, "A")).toThrow(/expiry/);
  });

  it("accepts one commitment per side and reports completion after two", () => {
    let state = initCommitmentState(true);
    expect(isRoomComplete(state)).toBe(false);

    state = acceptCommitment(state, "A");
    expect(isRoomComplete(state)).toBe(false);

    state = acceptCommitment(state, "B");
    expect(isRoomComplete(state)).toBe(true);
    expect(state.committedSides).toEqual(["A", "B"]);
  });

  it("rejects a second commitment from the same side", () => {
    const state = acceptCommitment(initCommitmentState(true), "A");
    expect(() => acceptCommitment(state, "A")).toThrow(/already committed/);
  });

  it("does not mutate the previous state (pure reducer)", () => {
    const before = initCommitmentState(true);
    acceptCommitment(before, "A");
    expect(before.committedSides).toEqual([]);
  });
});
