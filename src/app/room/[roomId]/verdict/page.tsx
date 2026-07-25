import Link from "next/link";
import { createReader, hederaMirrorClient } from "@/registry";
import { requireEnv } from "@/config/env";
import type { Verdict } from "@/session";
import { VerdictView } from "@/components/web/verdict-view";
import { readVerdictAction } from "./actions";

/**
 * Verdict screen: `/room/<roomId>/verdict`. Reads the room's expiry (for the countdown) and any
 * verdict from Mirror Node at load, then the client polls for the verdict until it appears.
 * Best-effort read — if Mirror is empty/laggy it renders the pending state and polls.
 */
export default async function VerdictPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  let deadlineIso: string | undefined;
  let initialVerdict: Verdict | null = null;
  try {
    const topicId = requireEnv("HEDERA_TOPIC_ID");
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    deadlineIso = view.expiry?.deadline;
    initialVerdict = view.verdict?.verdict ?? null;
  } catch {
    // No env / Mirror lag — render pending and let the client poll.
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-2 px-6">
      <nav className="mb-4 flex w-full max-w-md items-center justify-between">
        <Link
          href={`/room/${roomId}/share`}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Back to QR
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{roomId}</span>
      </nav>
      <VerdictView
        deadlineIso={deadlineIso}
        initialVerdict={initialVerdict}
        pollVerdict={readVerdictAction.bind(null, roomId)}
      />
    </main>
  );
}
