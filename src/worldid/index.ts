/**
 * M3 · `worldid` — World Selfie Check as an abuse signal, not a login (D7). Issues one seat
 * per `(room, side)` so a side submits once per room, closing the probing attack. See
 * `docs/modules/M3-worldid.md`. The React `selfie-check-gate` widget mounts in the web screen
 * (M8); this module is the server-side verify + seat logic.
 */
export { roomActionId } from "./action";
export {
  worldProofSchema,
  type WorldProof,
  type WorldVerifier,
  type WorldVerifyResult,
} from "./verify";
export {
  initSeatRegistry,
  reserveSeat,
  isSeatTaken,
  type SeatRegistry,
} from "./seats";
export {
  claimSeat,
  type ClaimSeatInput,
  type ClaimSeatDeps,
  type ClaimSeatResult,
} from "./claim";
export { cloudWorldVerifier } from "./cloud-verifier";
