"use server";

import { createRoom, useCaseIdSchema, type UseCaseId } from "@/session";
import { createRegistry, hederaTopicClient } from "@/registry";
import { env } from "@/config/env";

/**
 * `createRoom` Server Action (M8 / M1). Opens a room: publishes the expiry (incl. the D16
 * `useCase`) to the HCS topic (via M4 `registry.write`) before returning. Requires the Hedera
 * account env vars; throws clearly if unset.
 *
 * Returns the room id and BOTH join links (S3.8). It used to return only side B's, which left the
 * creator with no way back into their own room — they could not even return to write their own
 * position. `/room/[roomId]/share` rebuilds both from the id anyway, so the caller only strictly
 * needs `roomId`; the URLs come back so a caller that wants them need not re-derive them.
 */
export async function createRoomAction(
  deadlineIso: string,
  gapOptIn: boolean,
  useCase: UseCaseId,
): Promise<{ roomId: string; joinUrl: string; ownUrl: string }> {
  const registry = createRegistry(hederaTopicClient());
  const room = await createRoom(
    { deadlineIso, gapOptIn, useCase: useCaseIdSchema.parse(useCase) },
    { registry, baseUrl: env.APP_URL },
  );

  // ⚠️ `armReveal` (M5) is deliberately NOT called here yet — see S2.9's note in the
  // backlog. `hederaScheduleService(buildRevealTx)` needs a transaction for Hedera to
  // execute at the deadline, and the only one that would mean anything for us is a topic
  // message marking that the clock fired. That message would be a FOURTH topic type, and
  // `decodeMirrorMessage` throws on any shape outside the three-way union — so adding it
  // casually would break every read of every room. It belongs with S2.6 (topic
  // versioning), not in a late edit to the create path.
  //
  // What actually fires the reveal today is the server-side fallback on the deadline this
  // room just committed to the topic (DA5, `isDeadlineReached`). That deadline is public
  // and was published before anyone can write (RNF-M1-001), so neither side can move it —
  // which is the property the schedule was there to provide.

  return { roomId: room.roomId, joinUrl: room.joinUrls.B, ownUrl: room.joinUrls.A };
}
