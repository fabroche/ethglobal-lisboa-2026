import { describe, it, expect } from "vitest";
import { initSeatRegistry, reserveSeat, isSeatTaken, holdsSeatInRoom } from "./seats";

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

describe("seat registry — one person cannot hold both seats (D17)", () => {
  it("rejects the same nullifier taking the other side of the same room", () => {
    // The bug the owner found live: with a per-side action the same phone produced a valid
    // nullifier for each side. The action is room-scoped now, so one human yields the SAME
    // value twice — which is what makes this checkable at all.
    const seats = reserveSeat(initSeatRegistry(), {
      roomId: "r_1",
      side: "A",
      nullifierHash: "0xSAME",
    });
    expect(() =>
      reserveSeat(seats, { roomId: "r_1", side: "B", nullifierHash: "0xSAME" }),
    ).toThrow(/already holds a seat/);
  });

  it("still lets that person take a seat in a DIFFERENT room", () => {
    // Rooms stay unlinkable and people negotiate more than once — that must not break.
    const seats = reserveSeat(initSeatRegistry(), {
      roomId: "r_1",
      side: "A",
      nullifierHash: "0xSAME",
    });
    expect(() =>
      reserveSeat(seats, { roomId: "r_2", side: "B", nullifierHash: "0xSAME" }),
    ).not.toThrow();
  });

  it("holdsSeatInRoom does not confuse a room whose id prefixes another", () => {
    // `r_1` must not match `r_12`'s seats — the `:` in the key is what makes the prefix safe.
    const seats = reserveSeat(initSeatRegistry(), {
      roomId: "r_12",
      side: "A",
      nullifierHash: "0xN",
    });
    expect(holdsSeatInRoom(seats, "r_12", "0xN")).toBe(true);
    expect(holdsSeatInRoom(seats, "r_1", "0xN")).toBe(false);
  });

  it("two different people fill a room normally", () => {
    let seats = initSeatRegistry();
    seats = reserveSeat(seats, { roomId: "r_1", side: "A", nullifierHash: "0xALICE" });
    expect(() =>
      reserveSeat(seats, { roomId: "r_1", side: "B", nullifierHash: "0xBOB" }),
    ).not.toThrow();
  });
});
