import { z } from "zod";
import { sideSchema, type Side } from "./messages";
import { useCaseIdSchema } from "./usecases";

/**
 * Room domain: validate the create-room input, validate the deadline is in the future,
 * mint a room id, and build the per-side join links. Pure functions only — no Hedera SDK
 * and no ambient clock/RNG (both are injected), so every branch is unit-testable.
 */

const ROOM_ID_PREFIX = "r_";

/** Input to open a room. `deadlineIso` is validated as an ISO-8601 UTC instant here; the
 * "is it in the future?" check is separate ({@link assertFutureDeadline}) because it needs
 * the current time, which callers inject. */
export const createRoomInputSchema = z.object({
  deadlineIso: z.string().datetime(),
  /** D16 preset id; defaults to the primary demo case. Recorded on the expiry message. */
  useCase: useCaseIdSchema.default("property"),
  /** Optional override; when omitted, labels come from the preset (`USE_CASES[useCase]`). */
  sideLabels: z.object({ A: z.string().min(1), B: z.string().min(1) }).optional(),
  gapOptIn: z.boolean().default(false),
});
export type CreateRoomInput = z.input<typeof createRoomInputSchema>;
export type CreateRoomInputParsed = z.infer<typeof createRoomInputSchema>;

/** Throw unless `deadlineIso` is a valid instant strictly after `now` (RF-M1-002). */
export function assertFutureDeadline(deadlineIso: string, now: Date): void {
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) {
    throw new Error(`deadline is not a valid date: ${deadlineIso}`);
  }
  if (deadline.getTime() <= now.getTime()) {
    throw new Error("deadline must be in the future");
  }
}

/** Mint a room id from an injected id generator (e.g. `crypto.randomUUID`). */
export function generateRoomId(newId: () => string): string {
  return ROOM_ID_PREFIX + newId();
}

/**
 * Build the join link for one side. The URL encodes only the room id and side — never
 * anything about the terms (a QR/link must leak nothing, M1 §12). The QR image itself is
 * rendered by the web layer (M8); this returns the URL it encodes.
 */
export function buildJoinUrl(baseUrl: string, roomId: string, side: Side): string {
  const parsedSide = sideSchema.parse(side);
  const url = new URL(`/room/${encodeURIComponent(roomId)}`, baseUrl);
  url.searchParams.set("side", parsedSide);
  return url.toString();
}
