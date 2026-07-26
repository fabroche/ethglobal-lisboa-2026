"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface PendingRoomProps {
  roomId: string;
  /** Server action: true once the room's expiry is indexed by Mirror. */
  checkExpiry: (roomId: string) => Promise<boolean>;
  /** Stop polling and show the terminal message after this long (ms). */
  capMs?: number;
  /** Interval between polls (ms). */
  everyMs?: number;
  className?: string;
}

/**
 * S3.26 — the write page's first read can miss a just-created room because Mirror's
 * index lags a few seconds behind Hedera consensus. Instead of telling the user to
 * retry by hand, poll the topic and `router.refresh()` the moment the expiry appears
 * (which re-runs the server page, now finding it and rendering the form). After the cap
 * it shows the honest guidance — by then a persistent miss is likely a wrong link or
 * a genuine outage, not indexing lag.
 */
export function PendingRoom({
  roomId,
  checkExpiry,
  capMs = 15_000,
  everyMs = 2_000,
  className,
}: PendingRoomProps) {
  const [gaveUp, setGaveUp] = useState(false);
  const router = useRouter();
  const startedRef = useRef<number | null>(null);

  useEffect(() => {
    // Stamp the start after mount so the deadline isn't computed during render.
    startedRef.current = Date.now();
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      const found = await checkExpiry(roomId).catch(() => false);
      if (cancelled) return;
      if (found) {
        router.refresh(); // re-render the server page; it will now find the room
        return;
      }
      if (Date.now() - (startedRef.current ?? Date.now()) >= capMs) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(tick, everyMs);
    }

    let timer = setTimeout(tick, everyMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roomId, checkExpiry, capMs, everyMs, router]);

  if (gaveUp) {
    return (
      <p
        role="status"
        className={cn("w-full max-w-md rounded-xl border bg-card p-6 text-sm text-muted-foreground", className)}
      >
        No deadline is on the topic for this room. The clock is published before any position
        exists, so an empty topic means the room id is wrong or the link is stale. Ask for the
        join link again.
      </p>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full max-w-md items-center gap-3 rounded-xl border bg-card p-6 text-sm text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary motion-reduce:animate-none"
      />
      Opening the room… the deadline was just published and the network is catching up.
    </div>
  );
}
