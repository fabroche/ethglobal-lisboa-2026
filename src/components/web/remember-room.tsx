"use client";

import { useEffect } from "react";

import { createLocalBookmarkStore } from "@/lib/room-bookmarks-local";
import type { BookmarkLabel, RoomBookmark } from "@/lib/room-bookmarks";

export interface RememberRoomProps {
  roomId: string;
  side: RoomBookmark["side"];
  /**
   * The deal type, when the caller knows it (S3.11). Only the creator does,
   * client-side — someone arriving by join link does not, and it is deliberately
   * absent from that link so the deal type is not forwarded along with it.
   */
  label?: BookmarkLabel;
}

/**
 * Records a visited room so it can be listed later (S3.9). Renders nothing.
 *
 * A component rather than a hook call inside each page because the pages that need
 * it are Server Components, and this keeps the client boundary to one small leaf
 * instead of turning a whole screen into a client component.
 *
 * Deliberately fire-and-forget: a bookmark is convenience, and a storage failure
 * must never surface to the user or block the room. `createLocalBookmarkStore`
 * already swallows its own errors; the `.catch` here is belt-and-braces so an
 * unhandled rejection cannot appear in the console either.
 */
export function RememberRoom({ roomId, side, label }: RememberRoomProps) {
  useEffect(() => {
    void createLocalBookmarkStore()
      .remember(roomId, side, { label })
      .catch(() => {
        // Nothing to do, and nothing worth telling the user about.
      });
  }, [roomId, side, label]);

  return null;
}
