import { sideSchema, type Side } from "@/session";

/**
 * World action scoping (M3 · RF-M3-001, RNF-M3-001).
 *
 * The Selfie Check nullifier is derived from `(app_id, action, person)`. To get "one seat per
 * room per side" — and NOT "one use of Seam ever, app-wide" — the action must be scoped to the
 * exact `(room, side)`. A person can then negotiate many rooms but submit once per side per room.
 *
 * Deterministic and pure so the widget (client) and the verifier (server) derive the identical
 * action string for the same room/side.
 */
export function roomActionId(roomId: string, side: Side): string {
  const s = sideSchema.parse(side);
  if (!roomId) throw new Error("roomId is required to scope the World action");
  return `seam-${roomId}-${s}`;
}
