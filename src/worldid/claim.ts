import { sideSchema, type Side } from "@/session";
import { roomActionId } from "./action";
import { worldProofSchema, type WorldProof, type WorldVerifier } from "./verify";
import { reserveSeat, type SeatRegistry } from "./seats";

/**
 * `claimSeat` (M3 · Server Action `claimSeat`) — the orchestrator behind one seat per side.
 * It verifies the World proof server-side (**fail closed**: a failed proof throws and no seat is
 * reserved) and then reserves the `(room, side)` seat, rejecting a second claim — and, since
 * D17, rejecting a person who already holds the other seat of the room. Returns the opaque
 * nullifier ref that M4 stamps onto the commitment.
 *
 * The action is room-scoped, so the proof the widget produced is for `overlap-<roomId>` and the
 * same person verifying twice is refused by World before it ever reaches us.
 */
export interface ClaimSeatInput {
  roomId: string;
  side: Side;
  appId: string;
  proof: WorldProof;
  signal?: string;
}

export interface ClaimSeatDeps {
  verifier: WorldVerifier;
  seats: SeatRegistry;
}

export interface ClaimSeatResult {
  nullifierRef: string;
  seats: SeatRegistry;
}

export async function claimSeat(
  input: ClaimSeatInput,
  deps: ClaimSeatDeps,
): Promise<ClaimSeatResult> {
  const side = sideSchema.parse(input.side);
  const proof = worldProofSchema.parse(input.proof);
  const action = roomActionId(input.roomId);

  const result = await deps.verifier.verify(proof, { appId: input.appId, action, signal: input.signal });
  // Fail closed: no valid proof ⇒ no seat.
  if (!result.success || !result.nullifierHash) {
    throw new Error(`World Selfie Check failed${result.code ? ` (${result.code})` : ""}`);
  }

  const seats = reserveSeat(deps.seats, {
    roomId: input.roomId,
    side,
    nullifierHash: result.nullifierHash,
  });
  return { nullifierRef: result.nullifierHash, seats };
}
