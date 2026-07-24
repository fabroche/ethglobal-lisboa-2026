"use server";

import { createRoom } from "@/session";
import { createRegistry, hederaTopicClient } from "@/registry";
import { env } from "@/config/env";

/**
 * `createRoom` Server Action (M8 / M1). Opens a room: publishes the expiry to the HCS topic
 * (via M4 `registry.write`) before returning, and hands back the link Side B uses to join.
 * Requires the Hedera account env vars; throws clearly if unset.
 */
export async function createRoomAction(
  deadlineIso: string,
): Promise<{ roomId: string; joinUrl: string }> {
  const registry = createRegistry(hederaTopicClient());
  const room = await createRoom({ deadlineIso }, { registry, baseUrl: env.APP_URL });
  return { roomId: room.roomId, joinUrl: room.joinUrls.B };
}
