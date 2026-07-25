"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { createLocalBookmarkStore } from "@/lib/room-bookmarks-local";
import type { RoomBookmark, RoomBookmarkStore } from "@/lib/room-bookmarks";

export interface RecentRoomsProps {
  /**
   * Injected so this is testable and story-able without a browser store — and so
   * swapping in a server-backed store later touches only the call site (S3.9).
   */
  store?: RoomBookmarkStore;
  className?: string;
}

/** `2026-07-25T18:00:00Z` → `25 Jul, 18:00` in the reader's locale. */
function formatSaved(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * M8 `recent-rooms` (S3.9). Lists rooms this device has visited, so closing a tab
 * stops meaning losing a room.
 *
 * Shows the room id, your side and when you last opened it — and nothing else. Not
 * the use case, not the deadline: on the topic that metadata sits among strangers,
 * but in a list on someone's laptop it sits next to their name, and "negotiating a
 * property sale and an OTC trade" is an inference we should not hand to whoever
 * else uses the machine. Hence also the per-row Forget.
 *
 * Renders nothing at all when the list is empty — an empty "Recent rooms" heading
 * on the landing page would just be noise for a first-time visitor.
 */
export function RecentRooms({ store, className }: RecentRoomsProps) {
  const [bookmarks, setBookmarks] = useState<RoomBookmark[] | null>(null);

  // Resolved once: creating the default store touches `window`, which must not
  // happen during render on the server.
  const [resolvedStore] = useState<RoomBookmarkStore>(() => store ?? createLocalBookmarkStore());

  const refresh = useCallback(() => {
    void resolvedStore
      .list()
      .then(setBookmarks)
      .catch(() => setBookmarks([]));
  }, [resolvedStore]);

  useEffect(refresh, [refresh]);

  async function forget(roomId: string) {
    await resolvedStore.forget(roomId).catch(() => undefined);
    refresh();
  }

  // `null` = not read yet. Distinguished from `[]` so the first paint does not
  // flash an empty state before the store has answered.
  if (bookmarks === null || bookmarks.length === 0) return null;

  return (
    <section
      aria-labelledby="recent-rooms-heading"
      className={cn("flex w-full max-w-md flex-col gap-3", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="recent-rooms-heading" className="text-sm font-semibold tracking-tight">
          Rooms on this device
        </h2>
        <span className="text-xs text-muted-foreground">{bookmarks.length}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {bookmarks.map((bookmark) => (
          <li
            key={bookmark.roomId}
            className="flex items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={`/room/${bookmark.roomId}?side=${bookmark.side}`}
                className="truncate text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {bookmark.roomId}
              </Link>
              <span className="text-xs text-muted-foreground">
                Side {bookmark.side} · opened {formatSaved(bookmark.savedAt)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void forget(bookmark.roomId)}
              aria-label={`Forget room ${bookmark.roomId}`}
              className="min-h-11 shrink-0 rounded-full px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Forget
            </button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Stored in this browser only — never sent anywhere. Your positions are not kept here.
      </p>
    </section>
  );
}
