"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { createLocalBookmarkStore } from "@/lib/room-bookmarks-local";
import { filterBookmarks, type RoomBookmark, type RoomBookmarkStore } from "@/lib/room-bookmarks";
import { USE_CASES } from "@/session/usecases";

export interface RecentRoomsProps {
  /**
   * Injected so this is testable and story-able without a browser store — and so
   * swapping in a server-backed store later touches only the call site (S3.9).
   */
  store?: RoomBookmarkStore;
  /** Cap the list. The landing page shows a few; `/rooms` shows everything. */
  limit?: number;
  /** Search box + side filter. Off on the landing page, on at `/rooms` (S3.11). */
  searchable?: boolean;
  /** Link to the full list when the landing page has truncated it. */
  moreHref?: string;
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
 * M8 `recent-rooms` (S3.9, search added in S3.11). Lists rooms this device has
 * visited, so closing a tab stops meaning losing a room.
 *
 * Shows the room id, your side, the deal TYPE and when you last opened it. The type
 * is the preset the creator picked — a closed vocabulary of three, never free text,
 * so no figure, date or counterparty name can end up here even by accident. It is
 * what makes the list searchable at all: nobody recognises a room by its UUID.
 *
 * That is a knowing trade (see `room-bookmarks.ts`): a list on a shared laptop now
 * reveals what kind of deal someone has open. Hence the standing note under the list
 * and a per-row Forget.
 *
 * Renders nothing when empty — an empty heading on the landing page is noise for a
 * first-time visitor.
 */
export function RecentRooms({
  store,
  limit,
  searchable = false,
  moreHref,
  className,
}: RecentRoomsProps) {
  const [bookmarks, setBookmarks] = useState<RoomBookmark[] | null>(null);
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<"all" | "A" | "B">("all");

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

  const matched = useMemo(
    () => (bookmarks ? filterBookmarks(bookmarks, query, side, USE_CASES) : []),
    [bookmarks, query, side],
  );
  const shown = limit === undefined ? matched : matched.slice(0, limit);
  const hiddenCount = matched.length - shown.length;

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

      {searchable ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by type or room id"
            aria-label="Search rooms"
            className="min-h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div role="group" aria-label="Filter by side" className="flex gap-1">
            {(["all", "A", "B"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSide(option)}
                aria-pressed={side === option}
                className={cn(
                  "min-h-11 rounded-lg px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring",
                  side === option
                    ? "bg-primary text-primary-foreground"
                    : "border border-input text-muted-foreground hover:text-foreground",
                )}
              >
                {option === "all" ? "All" : `Side ${option}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p role="status" className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          No rooms match that.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((bookmark) => (
            <li
              key={bookmark.roomId}
              className="flex items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/room/${bookmark.roomId}?side=${bookmark.side}`}
                  className="truncate text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {bookmark.label ? USE_CASES[bookmark.label].title : bookmark.roomId}
                </Link>
                <span className="truncate text-xs text-muted-foreground">
                  Side {bookmark.side} · opened {formatSaved(bookmark.savedAt)}
                  {bookmark.label ? ` · ${bookmark.roomId}` : ""}
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
      )}

      {hiddenCount > 0 && moreHref ? (
        <Link
          href={moreHref}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          See all {matched.length} rooms →
        </Link>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Stored in this browser only — never sent anywhere. Your positions are not kept here, but the
        deal <em>type</em> is: use Forget on a shared device.
      </p>
    </section>
  );
}
