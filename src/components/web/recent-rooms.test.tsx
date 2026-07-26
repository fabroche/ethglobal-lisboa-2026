// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import type { RoomBookmark, RoomBookmarkStore } from "@/lib/room-bookmarks";
import { RecentRooms } from "./recent-rooms";

const bookmark = (
  roomId: string,
  side: "A" | "B" = "A",
  savedAt = "2026-07-25T18:00:00.000Z",
  label?: "property" | "job" | "otc",
) => ({ roomId, side, savedAt, ...(label ? { label } : {}) }) satisfies RoomBookmark;

function fakeStore(initial: RoomBookmark[]): RoomBookmarkStore & { forgotten: string[] } {
  let items = [...initial];
  const forgotten: string[] = [];
  return {
    forgotten,
    list: async () => items,
    remember: async () => undefined,
    forget: async (roomId) => {
      forgotten.push(roomId);
      items = items.filter((b) => b.roomId !== roomId);
    },
    clear: async () => {
      items = [];
    },
  };
}

describe("RecentRooms", () => {
  it("lists a remembered room, linking to the side you arrived as", async () => {
    render(<RecentRooms store={fakeStore([bookmark("r_9f3a", "B")])} />);

    const link = await screen.findByRole("link", { name: "r_9f3a" });
    expect(link).toHaveAttribute("href", "/room/r_9f3a?side=B");
    expect(screen.getByText(/side b/i)).toBeInTheDocument();
  });

  it("renders NOTHING when there are no rooms", async () => {
    const { container } = render(<RecentRooms store={fakeStore([])} />);
    // An empty "Rooms on this device" heading is noise for a first-time visitor.
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("renders the caller's empty state when there are no rooms, if given one", async () => {
    // /rooms supplies one (S3.12) because the navbar now links there unconditionally,
    // so the first person to arrive will be someone who has never opened a room. The
    // landing page passes none and keeps rendering nothing.
    render(<RecentRooms store={fakeStore([])} emptyState={<p>No rooms yet.</p>} />);
    expect(await screen.findByText("No rooms yet.")).toBeInTheDocument();
  });

  it("does not show the empty state while the store is still being read", () => {
    // Otherwise "no rooms yet" flashes at everyone, including people who have plenty.
    const pending: RoomBookmarkStore = {
      list: () => new Promise(() => {}),
      remember: async () => undefined,
      forget: async () => undefined,
      clear: async () => undefined,
    };
    render(<RecentRooms store={pending} emptyState={<p>No rooms yet.</p>} />);
    expect(screen.queryByText("No rooms yet.")).not.toBeInTheDocument();
  });

  it("does not flash an empty state before the store answers", () => {
    // `null` (unread) must be distinguishable from `[]` (read, empty).
    let resolve: (value: RoomBookmark[]) => void = () => {};
    const pending: RoomBookmarkStore = {
      list: () => new Promise((r) => (resolve = r)),
      remember: async () => undefined,
      forget: async () => undefined,
      clear: async () => undefined,
    };
    const { container } = render(<RecentRooms store={pending} />);

    expect(container).toBeEmptyDOMElement();
    resolve([bookmark("r_1")]);
  });

  it("forgets a room and drops it from the list", async () => {
    const store = fakeStore([bookmark("r_1"), bookmark("r_2", "B")]);
    render(<RecentRooms store={store} />);

    await screen.findByRole("link", { name: "r_1" });
    fireEvent.click(screen.getByRole("button", { name: /forget room r_1/i }));

    await waitFor(() => expect(store.forgotten).toEqual(["r_1"]));
    await waitFor(() => expect(screen.queryByRole("link", { name: "r_1" })).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "r_2" })).toBeInTheDocument();
  });

  it("says where the data lives, and that positions are not in it", async () => {
    render(<RecentRooms store={fakeStore([bookmark("r_1")])} />);
    expect(await screen.findByText(/this browser only/i)).toBeInTheDocument();
    expect(screen.getByText(/positions are not kept here/i)).toBeInTheDocument();
  });

  it("shows the deal TYPE when known, and says so under the list", async () => {
    // S3.11 knowingly reversed S3.9 here: the type is shown because a list of
    // UUIDs is unsearchable. The old version of this test asserted the opposite
    // and passed only because its fixture had no label — a test contradicting the
    // live policy is worse than no test.
    render(<RecentRooms store={fakeStore([bookmark("r_1", "A", undefined, "property")])} />);

    expect(await screen.findByRole("link", { name: /property sale/i })).toBeInTheDocument();
    // And the consequence is stated where the user can act on it.
    expect(screen.getByText(/use forget on a shared device/i)).toBeInTheDocument();
  });

  it("shows NO terms, figures or dates — only the type", async () => {
    // The line that did NOT move: the vocabulary is three fixed values, so no
    // price, deadline or counterparty name can reach this list even by accident.
    const { container } = render(
      <RecentRooms store={fakeStore([bookmark("r_1", "A", undefined, "property")])} />,
    );
    await screen.findByRole("link", { name: /property sale/i });

    expect(container.textContent).not.toMatch(/€|\d{3},\d{3}|deadline|CPCV/i);
  });

  it("falls back to the room id when the label is unknown", async () => {
    // Someone arriving by join link cannot know the type — the link deliberately
    // does not carry it.
    render(<RecentRooms store={fakeStore([bookmark("r_nolabel")])} />);
    expect(await screen.findByRole("link", { name: "r_nolabel" })).toBeInTheDocument();
  });

  it("survives a store that rejects, rather than breaking the landing page", async () => {
    const broken: RoomBookmarkStore = {
      list: async () => Promise.reject(new Error("blocked")),
      remember: async () => undefined,
      forget: async () => undefined,
      clear: async () => undefined,
    };
    const { container } = render(<RecentRooms store={broken} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe("RecentRooms · the port is what makes a database a later decision", () => {
  it("works against any RoomBookmarkStore, not just the browser one", async () => {
    // The whole point of S3.9's shape: swapping in a server-backed store is a new
    // adapter and this call site, not a refactor of the component.
    const serverish: RoomBookmarkStore = {
      list: vi.fn(async () => [bookmark("r_from_server", "A")]),
      remember: async () => undefined,
      forget: async () => undefined,
      clear: async () => undefined,
    };

    render(<RecentRooms store={serverish} />);

    expect(await screen.findByRole("link", { name: "r_from_server" })).toBeInTheDocument();
    expect(serverish.list).toHaveBeenCalled();
  });
});

/**
 * S3.11 · search and filter. The label is what makes this possible: nobody
 * recognises a room by its UUID.
 */
describe("RecentRooms · search and filter", () => {
  const many = [
    bookmark("r_flat", "A", "2026-07-25T18:00:00.000Z", "property"),
    bookmark("r_hire", "B", "2026-07-24T18:00:00.000Z", "job"),
    bookmark("r_block", "A", "2026-07-23T18:00:00.000Z", "otc"),
  ];

  it("hides the controls unless asked, so the landing page stays a pitch", async () => {
    render(<RecentRooms store={fakeStore(many)} />);
    await screen.findByRole("link", { name: /property sale/i });
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("searches by deal type", async () => {
    render(<RecentRooms store={fakeStore(many)} searchable />);
    await screen.findByRole("link", { name: /property sale/i });

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "job" } });

    expect(screen.getByRole("link", { name: /job offer/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /property sale/i })).not.toBeInTheDocument();
  });

  it("searches by room id, for when you have one pasted", async () => {
    render(<RecentRooms store={fakeStore(many)} searchable />);
    await screen.findByRole("link", { name: /property sale/i });

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "r_block" } });

    expect(screen.getByRole("link", { name: /otc trade/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /job offer/i })).not.toBeInTheDocument();
  });

  it("filters by side", async () => {
    render(<RecentRooms store={fakeStore(many)} searchable />);
    await screen.findByRole("link", { name: /property sale/i });

    fireEvent.click(screen.getByRole("button", { name: /^side b$/i }));

    expect(screen.getByRole("link", { name: /job offer/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /property sale/i })).not.toBeInTheDocument();
  });

  it("says so when nothing matches, instead of looking broken", async () => {
    render(<RecentRooms store={fakeStore(many)} searchable />);
    await screen.findByRole("link", { name: /property sale/i });

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });

    expect(screen.getByRole("status")).toHaveTextContent(/no rooms match/i);
  });

  it("truncates to the limit and offers the full list", async () => {
    render(<RecentRooms store={fakeStore(many)} limit={1} moreHref="/rooms" />);

    await screen.findByRole("link", { name: /property sale/i });
    expect(screen.queryByRole("link", { name: /job offer/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all 3 rooms/i })).toHaveAttribute("href", "/rooms");
  });

  it("does not offer the full list when nothing is hidden", async () => {
    render(<RecentRooms store={fakeStore(many)} limit={10} moreHref="/rooms" />);
    await screen.findByRole("link", { name: /property sale/i });
    expect(screen.queryByRole("link", { name: /see all/i })).not.toBeInTheDocument();
  });
});
