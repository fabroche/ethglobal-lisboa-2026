// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { RoomQr, isLoopbackUrl } from "./room-qr";

const URL_ = "https://seam.app/room/r_9f3a?side=B";

/** Remove the Clipboard API, reproducing any non-secure context (a LAN IP). */
function withoutClipboard(): void {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
}

function withClipboard(writeText = vi.fn().mockResolvedValue(undefined)): typeof writeText {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

describe("RoomQr", () => {
  beforeEach(() => {
    withClipboard();
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

  it("links to the room's verdict/countdown screen", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    expect(screen.getByRole("link", { name: /countdown and verdict/i })).toHaveAttribute(
      "href",
      "/room/r_9f3a/verdict",
    );
  });

  it("copies the link and confirms", async () => {
    const writeText = withClipboard();
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);

    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL_));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });
});

/**
 * The case the original test could not see. Mocking `navigator.clipboard` is
 * normal, but it meant the suite passed green while the button did nothing in the
 * one context the demo actually runs in: served over a LAN IP so a phone can scan
 * the QR, where `navigator.clipboard` does not exist at all.
 */
describe("RoomQr · copy without the Clipboard API (non-secure context)", () => {
  beforeEach(() => {
    withoutClipboard();
  });

  it("falls back to selecting the text instead of doing nothing", async () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    const input = screen.getByLabelText(/join link/i) as HTMLInputElement;
    const select = vi.spyOn(input, "select");

    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    expect(select).toHaveBeenCalled();
    // And it TELLS the user what to do next, rather than failing silently.
    expect(await screen.findByRole("button", { name: /press ctrl\+c/i })).toBeInTheDocument();
  });

  it("announces the fallback to screen readers", async () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    expect(await screen.findByText(/press control or command plus c/i)).toBeInTheDocument();
  });

  it("never leaves the button silently unchanged", async () => {
    // The original bug: catch { setCopied(false) } put the state back where it
    // already was, so a click produced no observable effect whatsoever.
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    const button = screen.getByRole("button", { name: /^copy$/i });
    const before = button.textContent;

    fireEvent.click(button);

    await waitFor(() => expect(button.textContent).not.toBe(before));
  });
});

describe("RoomQr · a rejected clipboard write still falls back", () => {
  it("selects the text when writeText throws", async () => {
    // Permission denied, or the document lost focus. Recoverable, so recover.
    withClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);

    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    expect(await screen.findByRole("button", { name: /press ctrl\+c/i })).toBeInTheDocument();
  });
});

describe("RoomQr · the feedback resets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    withClipboard();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns to Copy so a second copy also gives a signal", async () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeInTheDocument();
  });
});

describe("RoomQr · the localhost warning", () => {
  beforeEach(() => {
    withClipboard();
  });

  it("warns when the QR encodes a URL no phone can reach", () => {
    // The default in .env.local, so this failure lands during a demo unless caught.
    render(<RoomQr roomId="r_9f3a" joinUrl="http://localhost:3000/room/r_9f3a?side=B" />);
    expect(screen.getByRole("status")).toHaveTextContent(/points at localhost/i);
    expect(screen.getByRole("status")).toHaveTextContent(/APP_URL/);
  });

  it("stays quiet for a reachable URL", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stays quiet for a LAN address, which is the fix we recommend", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl="http://10.1.1.167:3000/room/r_9f3a?side=B" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("isLoopbackUrl", () => {
  it("catches every loopback spelling", () => {
    for (const url of [
      "http://localhost:3000/x",
      "http://127.0.0.1:3000/x",
      "http://[::1]:3000/x",
      "https://localhost/x",
    ]) {
      expect(isLoopbackUrl(url)).toBe(true);
    }
  });

  it("does not fire on hostnames that merely contain the word", () => {
    // `localhost.example.com` and `mylocalhost.dev` are real, reachable hosts.
    expect(isLoopbackUrl("https://localhost.example.com/x")).toBe(false);
    expect(isLoopbackUrl("https://mylocalhost.dev/x")).toBe(false);
    expect(isLoopbackUrl("https://seam.app/x")).toBe(false);
  });

  it("treats an unparseable URL as reachable rather than crashing the screen", () => {
    expect(isLoopbackUrl("not a url")).toBe(false);
  });
});
