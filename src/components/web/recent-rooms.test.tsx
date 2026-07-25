// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import type { RoomBookmark, RoomBookmarkStore } from "@/lib/room-bookmarks";
import { RecentRooms } from "./recent-rooms";

const bookmark = (roomId: string, side: "A" | "B" = "A", savedAt = "2026-07-25T18:00:00.000Z") =>
  ({ roomId, side, savedAt }) satisfies RoomBookmark;

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

  it("shows no deal metadata — no use case, no deadline", async () => {
    const { container } = render(<RecentRooms store={fakeStore([bookmark("r_1")])} />);
    await screen.findByRole("link", { name: "r_1" });

    // The privacy line, asserted on rendered output: a list on someone's laptop
    // must not reveal what KIND of deal they are negotiating.
    expect(container.textContent).not.toMatch(/property|job|otc|deadline/i);
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
