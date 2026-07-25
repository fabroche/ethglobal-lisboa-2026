"use server";

import { createReader, hederaMirrorClient } from "@/registry";
import { requireEnv } from "@/config/env";
import type { Verdict } from "@/session";

/**
 * `readVerdict` (M8 / M4 read path). Reads the room's verdict from the HCS topic via Mirror
 * Node. Returns `null` while the reveal hasn't fired (or Mirror hasn't indexed it yet), so the
 * verdict screen can keep polling and show a pending state.
 */
export async function readVerdictAction(roomId: string): Promise<Verdict | null> {
  const topicId = requireEnv("HEDERA_TOPIC_ID");
  try {
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    return view.verdict?.verdict ?? null;
  } catch {
    return null;
  }
}
