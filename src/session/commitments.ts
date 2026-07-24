import type { Side } from "./messages";

/**
 * Commitment-acceptance gate for a room, as a pure reducer over immutable state.
 *
 * Enforces the room invariants (spec-01 acceptance criteria):
 *  - no commitment is accepted until the expiry has been published (ordering, RNF-M1-001),
 *  - at most one commitment per side, and therefore at most two per room.
 *
 * This is the in-memory admission check; the durable source of truth is still the HCS
 * topic. Keeping it a pure `(state, side) -> state` reducer makes both rejection paths
 * trivially testable and free of side effects.
 */
export interface CommitmentState {
  readonly expiryPublished: boolean;
  readonly committedSides: readonly Side[];
}

export function initCommitmentState(expiryPublished: boolean): CommitmentState {
  return { expiryPublished, committedSides: [] };
}

/** Accept a commitment from `side`, returning the next state. Throws if the move is illegal. */
export function acceptCommitment(
  state: CommitmentState,
  side: Side,
): CommitmentState {
  if (!state.expiryPublished) {
    throw new Error("expiry must be published before any commitment is accepted");
  }
  if (state.committedSides.includes(side)) {
    throw new Error(`side ${side} has already committed`);
  }
  return { ...state, committedSides: [...state.committedSides, side] };
}

/** Both sides have committed — the room is ready for the sealed evaluation. */
export function isRoomComplete(state: CommitmentState): boolean {
  return state.committedSides.length === 2;
}
