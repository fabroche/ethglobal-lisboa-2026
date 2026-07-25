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
  about?: string,
): Promise<{ roomId: string; joinUrl: string; ownUrl: string }> {
  const registry = createRegistry(hederaTopicClient());
  const room = await createRoom(
    { deadlineIso, gapOptIn, useCase: useCaseIdSchema.parse(useCase), about },
    { registry, baseUrl: env.APP_URL },
  );
  return { roomId: room.roomId, joinUrl: room.joinUrls.B, ownUrl: room.joinUrls.A };
}
