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
});
