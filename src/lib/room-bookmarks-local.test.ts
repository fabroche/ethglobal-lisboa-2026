// @vitest-environment jsdom
/**
 * S3.9 · the localStorage adapter. The rules are tested in `room-bookmarks.test.ts`;
 * what matters here is that storage failures never escape.
 */
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

import { BOOKMARKS_KEY, createLocalBookmarkStore } from "./room-bookmarks-local";

describe("createLocalBookmarkStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a room", async () => {
    const store = createLocalBookmarkStore();
    await store.remember("r_9f3a", "A");

    expect(await store.list()).toEqual([
      { roomId: "r_9f3a", side: "A", savedAt: expect.any(String) },
    ]);
  });

  it("stores nothing but the three permitted fields", async () => {
    // The privacy assertion, read straight out of the raw string: whatever else
    // exists in the app, none of it may end up on disk here.
    const store = createLocalBookmarkStore();
    await store.remember("r_9f3a", "B");

    const raw = window.localStorage.getItem(BOOKMARKS_KEY)!;
    expect(JSON.parse(raw)).toEqual([{ roomId: "r_9f3a", side: "B", savedAt: expect.any(String) }]);
    expect(raw).not.toMatch(/useCase|property|job|otc|position|deadline/i);
  });

  it("is idempotent, since it runs on every visit", async () => {
    const store = createLocalBookmarkStore();
    await store.remember("r_9f3a", "A");
    await store.remember("r_9f3a", "A");

    expect(await store.list()).toHaveLength(1);
  });

  it("forgets one room without touching the others", async () => {
    const store = createLocalBookmarkStore();
    await store.remember("r_1", "A");
    await store.remember("r_2", "B");

    await store.forget("r_1");

    expect((await store.list()).map((b) => b.roomId)).toEqual(["r_2"]);
  });

  it("clears everything", async () => {
    const store = createLocalBookmarkStore();
    await store.remember("r_1", "A");

    await store.clear();

    expect(await store.list()).toEqual([]);
    expect(window.localStorage.getItem(BOOKMARKS_KEY)).toBeNull();
  });

  it("uses a versioned key so a future format change is detectable", () => {
    expect(BOOKMARKS_KEY).toMatch(/\.v\d+$/u);
  });
});

describe("createLocalBookmarkStore · failures must not escape", () => {
  beforeEach(() => {
    // Not optional: without this, state written by an earlier test leaks in and
    // the assertions below start depending on execution order.
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("survives hand-edited invalid JSON", async () => {
    window.localStorage.setItem(BOOKMARKS_KEY, "{not json");
    const store = createLocalBookmarkStore();

    expect(await store.list()).toEqual([]);
    // And it recovers: a later write still works.
    await store.remember("r_1", "A");
    expect(await store.list()).toHaveLength(1);
  });

  it("does not throw when setItem fails (quota, private mode, policy)", async () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const store = createLocalBookmarkStore();

    // Losing a bookmark is an inconvenience. Throwing here would put it on the
    // same footing as failing to seal a position, which it is not.
    await expect(store.remember("r_1", "A")).resolves.toBeUndefined();
  });

  it("does not throw when getItem fails", async () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked by policy");
    });
    const store = createLocalBookmarkStore();

    await expect(store.list()).resolves.toEqual([]);
  });

  it("does not throw when removeItem fails", async () => {
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new Error("nope");
    });
    const store = createLocalBookmarkStore();

    await expect(store.clear()).resolves.toBeUndefined();
  });
});
