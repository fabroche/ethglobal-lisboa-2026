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
  let committedCount = 0;
  let found = false;
  try {
    const topicId = requireEnv("HEDERA_TOPIC_ID");
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    deadlineIso = view.expiry?.deadline;
    initialVerdict = view.verdict?.verdict ?? null;
    committedCount = view.commitments.length;
    // The room exists on the topic iff it has any message for this id.
    found = Boolean(view.expiry ?? view.verdict) || committedCount > 0;
  } catch {
    // Env missing / Mirror error — treat as not-yet-found; the panel explains.
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
      {found ? (
        <>
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {committedCount} of 2 sides committed
          </p>
          <VerdictView
            deadlineIso={deadlineIso}
            initialVerdict={initialVerdict}
            pollVerdict={readVerdictAction.bind(null, roomId)}
          />
        </>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-xl border bg-card p-6 text-center text-card-foreground shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">Room not found</h1>
          <p className="text-sm text-muted-foreground">
            Nothing for this room is on the topic. If you just created it, give Mirror Node a few
            seconds and refresh — otherwise the link may be wrong.
          </p>
        </div>
      )}
    </main>
  );
}
