import { describe, it, expect } from "vitest";
import { initSeatRegistry, reserveSeat, isSeatTaken } from "./seats";

describe("seat registry", () => {
  it("reserves each side of a room once", () => {
    let seats = initSeatRegistry();
    seats = reserveSeat(seats, { roomId: "r_1", side: "A", nullifierHash: "0xA" });
    seats = reserveSeat(seats, { roomId: "r_1", side: "B", nullifierHash: "0xB" });
    expect(isSeatTaken(seats, "r_1", "A")).toBe(true);
    expect(isSeatTaken(seats, "r_1", "B")).toBe(true);
  });

  it("rejects a second claim on an already-taken (room, side)", () => {
    const seats = reserveSeat(initSeatRegistry(), { roomId: "r_1", side: "A", nullifierHash: "0xA" });
    expect(() =>
      reserveSeat(seats, { roomId: "r_1", side: "A", nullifierHash: "0xDIFFERENT" }),
    ).toThrow(/already taken/);
  });

  it("scopes seats per room — the same side in another room is free", () => {
    const seats = reserveSeat(initSeatRegistry(), { roomId: "r_1", side: "A", nullifierHash: "0xA" });
    expect(isSeatTaken(seats, "r_2", "A")).toBe(false);
    expect(() =>
      reserveSeat(seats, { roomId: "r_2", side: "A", nullifierHash: "0xA" }),
    ).not.toThrow();
  });

  it("does not mutate previous state (pure reducer)", () => {
    const before = initSeatRegistry();
    reserveSeat(before, { roomId: "r_1", side: "A", nullifierHash: "0xA" });
    expect(before.claimed).toEqual({});
  });
});
