import { sideSchema, type Side } from "@/session";

/**
 * Seat registry — one seat per `(room, side)` (M3 · RF-M3-003), as a pure reducer over
 * immutable state. This is what actually closes the probing/Sybil attack: a `(room, side)`
 * can be claimed exactly once, so a side can submit only once per room.
 *
 * We store only the opaque nullifier hash against the seat, never any identity (RNF-M3-002).
 * In-memory here; the durable record is the `worldNullifier` on the HCS commitment (M4).
 */
export interface SeatRegistry {
  /** Key `${roomId}:${side}` → nullifier hash that claimed it. */
  readonly claimed: Readonly<Record<string, string>>;
}

export function initSeatRegistry(): SeatRegistry {
  return { claimed: {} };
}

function seatKey(roomId: string, side: Side): string {
  return `${roomId}:${sideSchema.parse(side)}`;
}

/** Reserve the seat for `(roomId, side)`. Throws if that seat is already taken (seat = one submission). */
export function reserveSeat(
  state: SeatRegistry,
  seat: { roomId: string; side: Side; nullifierHash: string },
): SeatRegistry {
  const key = seatKey(seat.roomId, seat.side);
  if (key in state.claimed) {
    throw new Error(`seat ${key} is already taken`);
  }
  return { claimed: { ...state.claimed, [key]: seat.nullifierHash } };
}

/** Is the `(roomId, side)` seat already claimed? */
export function isSeatTaken(state: SeatRegistry, roomId: string, side: Side): boolean {
  return seatKey(roomId, side) in state.claimed;
}
