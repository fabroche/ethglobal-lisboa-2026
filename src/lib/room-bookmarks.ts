/**
 * Remembering which rooms you are in (S3.9).
 *
 * Seam has no accounts, so a room is reachable only by URL. Close the tab without
 * saving it and it is gone — the room still exists on the topic, but you have no
 * way to name it. This module is the smallest thing that fixes that.
 *
 * ── WHY THIS IS A PORT ──────────────────────────────────────────────────────
 * Today the store is `localStorage`: per-device, no server, no schema migration.
 * Tomorrow it might be a real account with a database, so that your rooms follow
 * you between devices. The two differ in exactly one way that infects call sites —
 * **a database is async and localStorage is not.**
 *
 * So the port is async NOW, while there is one implementation and no cost to it.
 * Writing it synchronously would be honest about today and would make the DB
 * version a rewrite of every caller instead of a new file. Same reasoning as
 * `RegistryPort`, `SealedModel` and `ScheduleService` elsewhere in the repo.
 *
 * ── WHAT IT IS ALLOWED TO STORE ─────────────────────────────────────────────
 * `{ roomId, side, savedAt }`. Nothing else, and nothing derived from a position.
 *
 * Notably NOT `useCase`, even though it is public metadata on the topic: on the
 * topic it sits among strangers, whereas on a device it sits next to a name, and
 * "this person is negotiating a property sale and an OTC trade" is an inference we
 * should not hand to whoever else uses that laptop. `side` is kept because without
 * it we cannot rebuild the right link, and it reveals a role rather than a term —
 * a smaller step than `roomId` already takes by proving you took part at all.
 */
import { z } from "zod";

/** Which seat you took. Mirrors `Side` in `src/session`, kept local to avoid a cycle. */
export const bookmarkSideSchema = z.enum(["A", "B"]);

/**
 * The preset the room was opened with. Kept as the searchable LABEL (S3.11).
 *
 * ⚠️ THIS REVERSES A DECISION, deliberately. S3.9 excluded it because a list on a
 * shared device would reveal what *kind* of deal someone is negotiating. That cost
 * is unchanged — what changed is the argument: searching a list of UUIDs is
 * useless, and the alternative was a free-text label, which invites "Lisbon flat
 * 400k" and leaks far more. A closed set of three that the user already chose is
 * the smaller of the two.
 *
 * Optional because only the room's CREATOR knows it client-side; someone arriving
 * by join link does not, and we will not put it in that link (it gets forwarded).
 */
export const bookmarkLabelSchema = z.enum(["property", "job", "otc"]);
export type BookmarkLabel = z.infer<typeof bookmarkLabelSchema>;

export const roomBookmarkSchema = z.object({
  roomId: z.string().min(1),
  side: bookmarkSideSchema,
  /** ISO instant. Used for ordering and for expiry — never for anything else. */
  savedAt: z.string().datetime(),
  /** The deal TYPE. Never a term, a figure or a name — the vocabulary makes that impossible. */
  label: bookmarkLabelSchema.optional(),
});

export type RoomBookmark = z.infer<typeof roomBookmarkSchema>;

/**
 * Drop bookmarks this old. A finished negotiation has no business sitting on a
 * device indefinitely, and nobody will ever prune this by hand.
 *
 * Deliberately based on `savedAt` rather than the room's deadline: keeping the
 * deadline would mean storing one more fact about the deal for no benefit the TTL
 * does not already provide.
 */
export const BOOKMARK_TTL_DAYS = 30;

/** Cap the list so a long session cannot grow it without bound. */
export const MAX_BOOKMARKS = 20;

/**
 * The swappable store.
 *
 * Async on purpose — see the header. Every method may reject; callers must treat
 * this as best-effort convenience and never let a failure here block the flow.
 * Losing a bookmark is an inconvenience; failing to seal a position is not.
 */
export interface RememberOptions {
  /** Deal type, when the caller knows it. Omitted for someone arriving by link. */
  label?: BookmarkLabel | undefined;
  now?: Date | undefined;
}

export interface RoomBookmarkStore {
  /** Newest first, expired entries already dropped. */
  list(): Promise<RoomBookmark[]>;
  /** Idempotent: saving a room you already have refreshes it rather than duplicating. */
  remember(roomId: string, side: RoomBookmark["side"], options?: RememberOptions): Promise<void>;
  forget(roomId: string): Promise<void>;
  clear(): Promise<void>;
}

// ─────────────────────────────────────────────────────────── pure helpers
// Kept separate from any storage so they are testable without a browser, and so a
// future DB adapter can reuse the same rules instead of reinventing them.

export function isExpired(bookmark: RoomBookmark, now: Date, ttlDays = BOOKMARK_TTL_DAYS): boolean {
  const saved = new Date(bookmark.savedAt).getTime();
  if (Number.isNaN(saved)) return true; // unparseable ⇒ drop it
  return now.getTime() - saved > ttlDays * 24 * 60 * 60 * 1000;
}

/**
 * Parse whatever was in storage into bookmarks we trust.
 *
 * Anything malformed is DISCARDED rather than repaired: this is a convenience
 * cache, and a half-understood entry is worth less than no entry. Users can also
 * edit localStorage by hand, so treating its contents as untrusted input is the
 * only defensible reading (D11 — validate everything external).
 */
export function decodeBookmarks(raw: unknown, now: Date): RoomBookmark[] {
  if (!Array.isArray(raw)) return [];
  const valid: RoomBookmark[] = [];
  for (const entry of raw) {
    const parsed = roomBookmarkSchema.safeParse(entry);
    if (parsed.success && !isExpired(parsed.data, now)) valid.push(parsed.data);
  }
  return sortAndCap(dedupe(valid));
}

/** One entry per room. The newest wins — re-entering a room refreshes it. */
export function dedupe(bookmarks: RoomBookmark[]): RoomBookmark[] {
  const byRoom = new Map<string, RoomBookmark>();
  for (const bookmark of bookmarks) {
    const existing = byRoom.get(bookmark.roomId);
    if (!existing || bookmark.savedAt > existing.savedAt) byRoom.set(bookmark.roomId, bookmark);
  }
  return [...byRoom.values()];
}

export function sortAndCap(bookmarks: RoomBookmark[], max = MAX_BOOKMARKS): RoomBookmark[] {
  return [...bookmarks].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, max);
}

/**
 * Apply a `remember` to a list, without touching storage.
 *
 * A known label is never overwritten by an unknown one: the creator learns it on
 * their redirect, and a later visit by join link (which cannot know it) must not
 * erase what we already had.
 */
export function upsert(
  bookmarks: RoomBookmark[],
  roomId: string,
  side: RoomBookmark["side"],
  now: Date,
  label?: BookmarkLabel,
): RoomBookmark[] {
  const previous = bookmarks.find((b) => b.roomId === roomId);
  const resolved = label ?? previous?.label;
  const next: RoomBookmark = {
    roomId,
    side,
    savedAt: now.toISOString(),
    ...(resolved ? { label: resolved } : {}),
  };
  return sortAndCap(dedupe([next, ...bookmarks]));
}

/**
 * Filter a list by free-text query and side.
 *
 * The query matches the room id and the label's display name — nothing else,
 * because nothing else is stored. Pure so `/rooms` and any future server-backed
 * list agree on what "matching" means.
 */
export function filterBookmarks(
  bookmarks: RoomBookmark[],
  query: string,
  side: "all" | RoomBookmark["side"],
  labels: Record<BookmarkLabel, { title: string }>,
): RoomBookmark[] {
  const needle = query.trim().toLowerCase();
  return bookmarks.filter((bookmark) => {
    if (side !== "all" && bookmark.side !== side) return false;
    if (needle.length === 0) return true;
    const title = bookmark.label ? labels[bookmark.label].title.toLowerCase() : "";
    return bookmark.roomId.toLowerCase().includes(needle) || title.includes(needle);
  });
}
