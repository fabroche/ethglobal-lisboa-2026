// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { JoinRoomPanel } from "./join-room-panel";

describe("JoinRoomPanel", () => {
  it("shows the room id and the joined side", () => {
    render(<JoinRoomPanel roomId="r_9f3a" side="B" />);
    expect(screen.getByText("r_9f3a")).toBeInTheDocument();
    expect(screen.getByText(/Side B/)).toBeInTheDocument();
  });

  it("flags a missing/invalid side", () => {
    render(<JoinRoomPanel roomId="r_9f3a" side={null} />);
    expect(screen.getByText(/unknown side/i)).toBeInTheDocument();
  });

  it("links to the room's verdict/countdown screen", () => {
    render(<JoinRoomPanel roomId="r_9f3a" side="B" />);
    expect(screen.getByRole("link", { name: /countdown and verdict/i })).toHaveAttribute(
      "href",
      "/room/r_9f3a/verdict",
    );
  });

  it("links to the write+seal screen carrying the side (S3.2)", () => {
    render(<JoinRoomPanel roomId="r_9f3a" side="B" />);
    expect(screen.getByRole("link", { name: /write and seal/i })).toHaveAttribute(
      "href",
      "/room/r_9f3a/write?side=B",
    );
  });

  it("offers no write link without a valid side (the link encodes the side)", () => {
    render(<JoinRoomPanel roomId="r_9f3a" side={null} />);
    expect(screen.queryByRole("link", { name: /write and seal/i })).not.toBeInTheDocument();
  });
});
