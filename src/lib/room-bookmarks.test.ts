/**
 * S3.9 · the rules, tested without a browser — which is the point of keeping them
 * out of the adapter. A future DB implementation inherits every guarantee below.
 */
import { describe, expect, it } from "vitest";

import {
  BOOKMARK_TTL_DAYS,
  MAX_BOOKMARKS,
  decodeBookmarks,
  dedupe,
  isExpired,
  roomBookmarkSchema,
  sortAndCap,
  upsert,
  filterBookmarks,
} from "./room-bookmarks";

const NOW = new Date("2026-07-25T18:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const bookmark = (roomId: string, savedAt = NOW.toISOString(), side: "A" | "B" = "A") => ({
  roomId,
  side,
  savedAt,
});

describe("the bookmark shape", () => {
  it("accepts exactly the three fields it needs", () => {
    expect(roomBookmarkSchema.safeParse(bookmark("r_1")).success).toBe(true);
  });

  it("rejects an entry missing the side, rather than guessing one", () => {
    // Guessing would send someone into the wrong seat.
    expect(roomBookmarkSchema.safeParse({ roomId: "r_1", savedAt: NOW.toISOString() }).success).toBe(
      false,
    );
  });

  it("strips anything else that shows up", () => {
    // The privacy line: even if a caller passes a position or a useCase, it must
    // not survive into storage.
    const parsed = roomBookmarkSchema.parse({
      ...bookmark("r_1"),
      useCase: "property",
      position: "I won't sell below €400,000",
    });

    expect(parsed).toEqual(bookmark("r_1"));
    expect(Object.keys(parsed)).toEqual(["roomId", "side", "savedAt"]);
  });
});

describe("isExpired", () => {
  it("keeps a recent bookmark and drops an old one", () => {
    expect(isExpired(bookmark("r_1", daysAgo(1)), NOW)).toBe(false);
    expect(isExpired(bookmark("r_1", daysAgo(BOOKMARK_TTL_DAYS + 1)), NOW)).toBe(true);
  });

  it("treats an unparseable date as expired, not as fresh", () => {
    // Failing open here would keep junk forever.
    expect(isExpired({ roomId: "r_1", side: "A", savedAt: "nonsense" }, NOW)).toBe(true);
  });
});

describe("decodeBookmarks — storage is untrusted input (D11)", () => {
  it("discards malformed entries but keeps the good ones", () => {
    // localStorage is hand-editable, so this is a real input class.
    const decoded = decodeBookmarks(
      [bookmark("r_good"), { roomId: "r_bad" }, "nope", null, 42, { side: "A" }],
      NOW,
    );
    expect(decoded.map((b) => b.roomId)).toEqual(["r_good"]);
  });

  it("returns empty for anything that is not an array", () => {
    for (const raw of [null, undefined, "[]", 7, {}]) {
      expect(decodeBookmarks(raw, NOW)).toEqual([]);
    }
  });

  it("prunes expired entries on read, so reading is also cleaning", () => {
    const decoded = decodeBookmarks(
      [bookmark("r_fresh", daysAgo(2)), bookmark("r_stale", daysAgo(90))],
      NOW,
    );
    expect(decoded.map((b) => b.roomId)).toEqual(["r_fresh"]);
  });

  it("never lets an unexpected field through from storage", () => {
    const decoded = decodeBookmarks([{ ...bookmark("r_1"), useCase: "otc" }], NOW);
    expect(decoded[0]).not.toHaveProperty("useCase");
  });
});

describe("dedupe", () => {
  it("keeps one entry per room, the newest", () => {
    const result = dedupe([
      bookmark("r_1", daysAgo(5), "A"),
      bookmark("r_1", daysAgo(1), "B"),
      bookmark("r_2", daysAgo(3)),
    ]);

    expect(result).toHaveLength(2);
    // Re-entering as the other side updates the recorded side.
    expect(result.find((b) => b.roomId === "r_1")?.side).toBe("B");
  });
});

describe("sortAndCap", () => {
  it("orders newest first", () => {
    const result = sortAndCap([
      bookmark("r_old", daysAgo(9)),
      bookmark("r_new", daysAgo(1)),
      bookmark("r_mid", daysAgo(5)),
    ]);
    expect(result.map((b) => b.roomId)).toEqual(["r_new", "r_mid", "r_old"]);
  });

  it("caps the list so a long session cannot grow it without bound", () => {
    const many = Array.from({ length: MAX_BOOKMARKS + 15 }, (_, i) =>
      bookmark(`r_${i}`, daysAgo(i % BOOKMARK_TTL_DAYS)),
    );
    expect(sortAndCap(many)).toHaveLength(MAX_BOOKMARKS);
  });

  it("drops the OLDEST when capping, not the newest", () => {
    const many = Array.from({ length: MAX_BOOKMARKS + 1 }, (_, i) =>
      bookmark(`r_${i}`, daysAgo(i)),
    );
    const result = sortAndCap(many);
    expect(result[0]!.roomId).toBe("r_0");
    expect(result.map((b) => b.roomId)).not.toContain(`r_${MAX_BOOKMARKS}`);
  });
});

describe("upsert", () => {
  it("adds a new room at the top", () => {
    const result = upsert([bookmark("r_old", daysAgo(3))], "r_new", "B", NOW);
    expect(result[0]).toEqual({ roomId: "r_new", side: "B", savedAt: NOW.toISOString() });
  });

  it("refreshes an existing room instead of duplicating it", () => {
    // Idempotent, because this runs on every visit to a room.
    const result = upsert([bookmark("r_1", daysAgo(9), "A")], "r_1", "A", NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.savedAt).toBe(NOW.toISOString());
  });

  it("records the side you actually arrived as", () => {
    const result = upsert([bookmark("r_1", daysAgo(2), "A")], "r_1", "B", NOW);
    expect(result[0]!.side).toBe("B");
  });
});

/**
 * S3.11 · the label and the filter. The label is a CLOSED vocabulary on purpose:
 * free text would invite "Lisbon flat 400k", which leaks far more than a type.
 */
describe("the label (S3.11)", () => {
  it("accepts only the three presets", () => {
    for (const label of ["property", "job", "otc"]) {
      expect(roomBookmarkSchema.safeParse({ ...bookmark("r_1"), label }).success).toBe(true);
    }
  });

  it("rejects free text, so no figure or name can be stored as a label", () => {
    // This is the whole reason the label is an enum and not a string.
    for (const label of ["Lisbon flat 400k", "Acme offer", "", "PROPERTY", "divorce"]) {
      expect(roomBookmarkSchema.safeParse({ ...bookmark("r_1"), label }).success).toBe(false);
    }
  });

  it("is optional, since only the creator knows it", () => {
    expect(roomBookmarkSchema.safeParse(bookmark("r_1")).success).toBe(true);
  });
});

describe("upsert · the label survives a later visit that cannot know it", () => {
  it("keeps a known label when re-remembered without one", () => {
    // The creator learns the type on their redirect; a later visit by join link
    // has no way to know it and must not erase what we already had.
    const withLabel = [{ ...bookmark("r_1", daysAgo(2)), label: "property" as const }];
    const result = upsert(withLabel, "r_1", "A", NOW);

    expect(result[0]!.label).toBe("property");
  });

  it("lets an explicit label overwrite an older one", () => {
    const withLabel = [{ ...bookmark("r_1", daysAgo(2)), label: "property" as const }];
    const result = upsert(withLabel, "r_1", "A", NOW, "otc");

    expect(result[0]!.label).toBe("otc");
  });

  it("stores no label key at all when none is known", () => {
    // Rather than `label: undefined`, which would survive JSON round-trips as a key.
    expect(upsert([], "r_1", "A", NOW)[0]).not.toHaveProperty("label");
  });
});

describe("filterBookmarks", () => {
  const LABELS = {
    property: { title: "Property sale" },
    job: { title: "Job offer" },
    otc: { title: "OTC trade" },
  };
  const items = [
    { ...bookmark("r_flat", daysAgo(1), "A"), label: "property" as const },
    { ...bookmark("r_hire", daysAgo(2), "B"), label: "job" as const },
    { ...bookmark("r_plain", daysAgo(3), "A") },
  ];

  it("returns everything for an empty query", () => {
    expect(filterBookmarks(items, "", "all", LABELS)).toHaveLength(3);
    expect(filterBookmarks(items, "   ", "all", LABELS)).toHaveLength(3);
  });

  it("matches the label's display name, case-insensitively", () => {
    expect(filterBookmarks(items, "property", "all", LABELS).map((b) => b.roomId)).toEqual(["r_flat"]);
    expect(filterBookmarks(items, "JOB", "all", LABELS).map((b) => b.roomId)).toEqual(["r_hire"]);
  });

  it("matches the room id, for when you have one pasted", () => {
    expect(filterBookmarks(items, "r_plain", "all", LABELS).map((b) => b.roomId)).toEqual(["r_plain"]);
  });

  it("filters by side, and combines with the query", () => {
    expect(filterBookmarks(items, "", "A", LABELS).map((b) => b.roomId)).toEqual(["r_flat", "r_plain"]);
    expect(filterBookmarks(items, "property", "B", LABELS)).toEqual([]);
  });

  it("does not crash on an unlabelled room", () => {
    expect(filterBookmarks(items, "sale", "all", LABELS).map((b) => b.roomId)).toEqual(["r_flat"]);
  });
});
