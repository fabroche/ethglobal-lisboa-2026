// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { RoomBookmark } from "@/lib/room-bookmarks";

const remember = vi.fn(async () => {});
let bookmarks: RoomBookmark[] = [];
vi.mock("@/lib/room-bookmarks-local", () => ({
  createLocalBookmarkStore: () => ({
    list: async () => bookmarks,
    remember,
    forget: async () => {},
    clear: async () => {},
  }),
}));

import { ShareView } from "./share-view";

const URLS = {
  roomId: "r_1",
  urlA: "https://x.app/room/r_1?side=A",
  urlB: "https://x.app/room/r_1?side=B",
  labels: { A: "Seller", B: "Buyer" },
};

beforeEach(() => {
  remember.mockClear();
  bookmarks = [];
});

describe("ShareView — resolving whose screen this is", () => {
  it("uses the declared side from the redirect and persists it", async () => {
    render(<ShareView {...URLS} queryMe="B" bookmarkLabel="property" />);
    expect(await screen.findByText(/you — the buyer/i)).toBeInTheDocument();
    expect(screen.getByText(/for the seller — have them scan this/i)).toBeInTheDocument();
    await waitFor(() => expect(remember).toHaveBeenCalledWith("r_1", "B", { label: "property" }));
  });

  it("falls back to the device bookmark on a bare /share visit (the Back-to-QR fix)", async () => {
    bookmarks = [
      { roomId: "r_1", side: "B", savedAt: new Date().toISOString() } as RoomBookmark,
    ];
    render(<ShareView {...URLS} />);
    expect(await screen.findByText(/you — the buyer/i)).toBeInTheDocument();
    // Resolved, not declared — must NOT overwrite the stored bookmark.
    expect(remember).not.toHaveBeenCalled();
  });

  it("defaults to side A with no query and no bookmark (a stranger with the link)", async () => {
    render(<ShareView {...URLS} />);
    expect(await screen.findByText(/you — the seller/i)).toBeInTheDocument();
  });

  it("maps the QR to the counterpart's link for a side-B viewer", async () => {
    bookmarks = [
      { roomId: "r_1", side: "B", savedAt: new Date().toISOString() } as RoomBookmark,
    ];
    render(<ShareView {...URLS} />);
    await screen.findByText(/you — the buyer/i);
    expect(screen.getByRole("textbox", { name: /^room join link$/i })).toHaveValue(URLS.urlA);
    expect(screen.getByRole("textbox", { name: /^your own link$/i })).toHaveValue(URLS.urlB);
  });

  it("renders the positional layout when the deal type is unknown", async () => {
    render(<ShareView roomId="r_1" urlA={URLS.urlA} urlB={URLS.urlB} />);
    expect(
      await screen.findByText(/share this link so the other side can join/i),
    ).toBeInTheDocument();
  });
});
