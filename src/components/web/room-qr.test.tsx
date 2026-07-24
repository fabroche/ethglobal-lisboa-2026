// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RoomQr } from "./room-qr";

const URL_ = "https://seam.app/room/r_9f3a?side=B";

describe("RoomQr", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("shows the join link", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    expect(screen.getByLabelText(/join link/i)).toHaveValue(URL_);
  });

  it("renders a scannable QR (SVG) labelled with the room", () => {
    const { container } = render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    expect(screen.getByRole("img", { name: /join qr for room r_9f3a/i })).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("copies the link and confirms", async () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL_));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });
});
