/**
 * World action scoping (M3 · RF-M3-001, RNF-M3-001, D17).
 *
 * The nullifier is derived from `(app_id, action, person)`, so the action string decides what
 * "one seat" means. It is scoped to the **room** — not to the app, and (since D17) not to the
 * side:
 *
 * - **App-wide** (`overlap`) would mean one use of Overlap ever, per person. Rejected: people
 *   negotiate more than once.
 * - **Per side** (`overlap-<roomId>-<side>`) is what we shipped until 26 Jul, and it was a hole:
 *   two actions ⇒ two valid nullifiers for the same human ⇒ **one phone could take both seats**
 *   of a room. Found live by the owner.
 * - **Per room** (`overlap-<roomId>`) keeps rooms unlinkable from each other while making the two
 *   seats of a room compete for the same nullifier — so the same person cannot hold both. World
 *   enforces this itself via `max_verifications: 1`, which survives our process restarting.
 *
 * Deterministic and pure so the widget (client) and the verifier (server) derive the identical
 * action string for the same room.
 */
export function roomActionId(roomId: string): string {
  if (!roomId) throw new Error("roomId is required to scope the World action");
  return `overlap-${roomId}`;
}
