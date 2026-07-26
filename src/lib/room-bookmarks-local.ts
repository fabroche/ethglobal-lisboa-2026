/**
 * `localStorage` adapter for `RoomBookmarkStore` (S3.9).
 *
 * The only file that knows bookmarks live in a browser. All the rules — expiry,
 * dedupe, ordering, validation — are in `room-bookmarks.ts` so a future server
 * adapter reuses them rather than reinventing them, and so they can be tested
 * without a DOM.
 *
 * Every operation is best-effort and swallows its errors. `localStorage` throws in
 * more situations than people expect: private browsing on some engines, storage
 * quota exceeded, or a corporate policy blocking it entirely. None of those should
 * break the page — this is convenience, and a room is still perfectly usable
 * without a bookmark. What must never happen is a failed bookmark write bubbling up
 * into the seal or publish path.
 */
import {
  decodeBookmarks,
  upsert,
  type RoomBookmark,
  type RoomBookmarkStore,
} from "./room-bookmarks";

/** Versioned so a future format change can be detected instead of mis-parsed. */
export const BOOKMARKS_KEY = "seam.rooms.v1";

function readRaw(): unknown {
  try {
    const stored = window.localStorage.getItem(BOOKMARKS_KEY);
    return stored === null ? [] : JSON.parse(stored);
  } catch {
    // Unavailable, or someone hand-edited it into invalid JSON.
    return [];
  }
}

function writeRaw(bookmarks: RoomBookmark[]): void {
  try {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // Quota, private mode, or blocked by policy. Nothing useful to do, and
    // nothing here is important enough to interrupt the user over.
  }
}

/**
 * Build the browser-backed store.
 *
 * Safe to call during SSR: with no `window` it returns a store that reads empty
 * and writes nothing, so callers do not need their own guards.
 */
export function createLocalBookmarkStore(): RoomBookmarkStore {
  const available = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  if (!available) {
    return {
      list: async () => [],
      remember: async () => undefined,
      forget: async () => undefined,
      clear: async () => undefined,
    };
  }

  return {
    async list(): Promise<RoomBookmark[]> {
      // Decoding drops expired and malformed entries, so reading is also pruning.
      return decodeBookmarks(readRaw(), new Date());
    },

    async remember(roomId, side, options): Promise<void> {
      const now = options?.now ?? new Date();
      const current = decodeBookmarks(readRaw(), now);
      writeRaw(upsert(current, roomId, side, now, options?.label));
    },

    async forget(roomId): Promise<void> {
      const current = decodeBookmarks(readRaw(), new Date());
      writeRaw(current.filter((bookmark) => bookmark.roomId !== roomId));
    },

    async clear(): Promise<void> {
      try {
        window.localStorage.removeItem(BOOKMARKS_KEY);
      } catch {
        // Same as writeRaw: not worth surfacing.
      }
    },
  };
}
