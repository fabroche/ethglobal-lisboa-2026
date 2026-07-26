import { sideSchema, type Side } from "@/session";

/**
 * Seat registry — a pure reducer over immutable state, enforcing two distinct rules:
 *
 * 1. **One seat per `(room, side)`** (RF-M3-003) — a side submits once per room. This is what
 *    closes the probing attack: your counterparty commits once, and you cannot re-submit a
 *    different number against their fixed position to binary-search their limit.
 * 2. **One seat per person per room** (RF-M3-005, D17) — the same nullifier cannot hold both
 *    seats. Since D17 the action is room-scoped, so both seats yield nullifiers from the same
 *    action and one human produces the same value twice, which makes this checkable at all.
 *
 * Rule 2 is defence in depth: World already refuses the second verification of a room-scoped
 * action (`max_verifications: 1`), and that check lives on their servers rather than in this
 * process — which matters, because this registry is in-memory and a restart forgets it.
 *
 * We store only the opaque nullifier hash against the seat, never any identity (RNF-M3-002).
 * The durable record is the `worldNullifier` on the HCS commitment (M4) — and because both
 * sides now share one action, any reader of the topic can compare the two and see for
 * themselves that two different humans took part.
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

/**
 * Reserve the seat for `(roomId, side)`. Throws if that seat is taken, or if this person
 * already holds the other seat of the same room (D17).
 */
export function reserveSeat(
  state: SeatRegistry,
  seat: { roomId: string; side: Side; nullifierHash: string },
): SeatRegistry {
  const key = seatKey(seat.roomId, seat.side);
  if (key in state.claimed) {
    throw new Error(`seat ${key} is already taken`);
  }
  if (holdsSeatInRoom(state, seat.roomId, seat.nullifierHash)) {
    throw new Error(
      `this person already holds a seat in room ${seat.roomId} — each side must be a different person`,
    );
  }
  return { claimed: { ...state.claimed, [key]: seat.nullifierHash } };
}

/** Is the `(roomId, side)` seat already claimed? */
export function isSeatTaken(state: SeatRegistry, roomId: string, side: Side): boolean {
  return seatKey(roomId, side) in state.claimed;
}

/**
 * Does this nullifier already hold any seat in the room? (D17)
 *
 * The `:` in the key is what makes the prefix safe: room `r_1` cannot match `r_12`'s seats,
 * because the comparison is against `r_1:` and not `r_1`.
 */
export function holdsSeatInRoom(
  state: SeatRegistry,
  roomId: string,
  nullifierHash: string,
): boolean {
  const prefix = `${roomId}:`;
  return Object.entries(state.claimed).some(
    ([key, claimedBy]) => key.startsWith(prefix) && claimedBy === nullifierHash,
  );
}
