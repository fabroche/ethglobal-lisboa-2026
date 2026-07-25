"use server";

import { createRoom, useCaseIdSchema, type UseCaseId } from "@/session";
import { createRegistry, hederaTopicClient } from "@/registry";
import { env } from "@/config/env";

/**
 * `createRoom` Server Action (M8 / M1). Opens a room: publishes the expiry (incl. the D16
 * `useCase`) to the HCS topic (via M4 `registry.write`) before returning, and hands back the
 * link Side B uses to join. Requires the Hedera account env vars; throws clearly if unset.
 */
export async function createRoomAction(
  deadlineIso: string,
  gapOptIn: boolean,
  useCase: UseCaseId,
): Promise<{ roomId: string; joinUrl: string }> {
  const registry = createRegistry(hederaTopicClient());
  const room = await createRoom(
    { deadlineIso, gapOptIn, useCase: useCaseIdSchema.parse(useCase) },
    { registry, baseUrl: env.APP_URL },
  );
  return { roomId: room.roomId, joinUrl: room.joinUrls.B };
}
