// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { RoomQr, isLoopbackUrl } from "./room-qr";

const URL_ = "https://overlap.app/room/r_9f3a?side=B";
const OWN_ = "https://overlap.app/room/r_9f3a?side=A";

/** Remove the Clipboard API, reproducing any non-secure context (a LAN IP). */
function withoutClipboard(): void {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
}

function withClipboard(writeText = vi.fn().mockResolvedValue(undefined)): typeof writeText {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

/**
 * The copy button's accessible NAME is static (it names the action); its visible
 * TEXT carries the state. So queries find it by name and assert on textContent —
 * which is also what a sighted user actually reads.
 */
const shareButton = () => screen.getByRole("button", { name: /^copy room join link$/i });
const shareInput = () => screen.getByRole("textbox", { name: /^room join link$/i });
const ownButton = () => screen.getByRole("button", { name: /^copy your own link$/i });

describe("RoomQr", () => {
  beforeEach(() => {
    withClipboard();
  });

  it("shows the join link", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    expect(shareInput()).toHaveValue(URL_);
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

    fireEvent.click(shareButton());

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL_));
    await waitFor(() => expect(shareButton()).toHaveTextContent(/copied/i));
  });

  it("keeps the button's accessible name stable as the state changes", async () => {
    // A control whose name changes while you use it is disorienting with a screen
    // reader: the thing you just found stops being called what it was called.
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    fireEvent.click(shareButton());

    await waitFor(() => expect(shareButton()).toHaveTextContent(/copied/i));
    expect(shareButton()).toBeInTheDocument();
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
    const select = vi.spyOn(shareInput() as HTMLInputElement, "select");

    fireEvent.click(shareButton());

    expect(select).toHaveBeenCalled();
    // And it TELLS the user what to do next, rather than failing silently.
    await waitFor(() => expect(shareButton()).toHaveTextContent(/press ctrl\+c/i));
  });

  it("announces the fallback to screen readers", async () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    fireEvent.click(shareButton());

    expect(await screen.findByText(/press control or command plus c/i)).toBeInTheDocument();
  });

  it("never leaves the button silently unchanged", async () => {
    // The original bug: catch { setCopied(false) } put the state back where it
    // already was, so a click produced no observable effect whatsoever.
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    const before = shareButton().textContent;

    fireEvent.click(shareButton());

    await waitFor(() => expect(shareButton().textContent).not.toBe(before));
  });
});

describe("RoomQr · a rejected clipboard write still falls back", () => {
  it("selects the text when writeText throws", async () => {
    // Permission denied, or the document lost focus. Recoverable, so recover.
    withClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);

    fireEvent.click(shareButton());

    await waitFor(() => expect(shareButton()).toHaveTextContent(/press ctrl\+c/i));
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
    fireEvent.click(shareButton());

    await act(async () => {
      await Promise.resolve();
    });
    expect(shareButton()).toHaveTextContent(/copied/i);

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(shareButton()).toHaveTextContent(/^copy$/i);
  });
});

/**
 * S3.8. Without this the creator has no way back into their own room — the create
 * screen used to show side B's link alone, so A could not even return to write
 * their own position.
 */
describe("RoomQr · the creator's own link", () => {
  beforeEach(() => {
    withClipboard();
  });

  it("shows it, separately from the one to share", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} ownUrl={OWN_} />);

    expect(screen.getByRole("textbox", { name: /^your own link$/i })).toHaveValue(OWN_);
    expect(shareInput()).toHaveValue(URL_);
  });

  it("tells the user it is the only way back, since there are no accounts", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} ownUrl={OWN_} />);
    expect(screen.getByText(/save it now/i)).toBeInTheDocument();
  });

  it("gives each link its own copy button and independent feedback", async () => {
    const writeText = withClipboard();
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} ownUrl={OWN_} />);

    fireEvent.click(ownButton());

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OWN_));
    // The OWN button confirms; the share button must NOT — one shared state would
    // tell the user they copied something they did not.
    await waitFor(() => expect(ownButton()).toHaveTextContent(/copied/i));
    expect(shareButton()).toHaveTextContent(/^copy$/i);
  });

  it("omits the section entirely when there is no own link", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} />);
    expect(screen.queryByRole("textbox", { name: /^your own link$/i })).not.toBeInTheDocument();
  });

  it("encodes the OTHER side's link in the QR, not the creator's", () => {
    // Scanning your own QR would walk the creator into side B's seat.
    const { container } = render(<RoomQr roomId="r_9f3a" joinUrl={URL_} ownUrl={OWN_} />);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(shareInput()).toHaveValue(URL_);
  });
});

/**
 * Role framing (the both-Buyers fix). Optional and additive: with no labels the
 * component renders the positional layout every test above asserts.
 */
describe("RoomQr · role-framed layout", () => {
  beforeEach(() => {
    withClipboard();
  });

  const roleProps = {
    roomId: "r_9f3a",
    joinUrl: URL_,
    ownUrl: OWN_,
    theirLabel: "Seller",
    yourLabel: "Buyer",
    writeUrl: "/room/r_9f3a/write?side=B",
  };

  it("names whose door the QR is", () => {
    render(<RoomQr {...roleProps} />);
    expect(screen.getByText(/for the seller: have them scan this/i)).toBeInTheDocument();
    expect(screen.getByText(/the qr and the link below are the same door/i)).toBeInTheDocument();
  });

  it("names the creator's role and offers the direct write CTA", () => {
    render(<RoomQr {...roleProps} />);
    expect(screen.getByText(/you \(the buyer\)/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /write your position/i })).toHaveAttribute(
      "href",
      "/room/r_9f3a/write?side=B",
    );
  });

  it("shows the context anchor, linkified when it is a URL", () => {
    render(<RoomQr {...roleProps} about="https://listing.example/t3" />);
    expect(screen.getByRole("link", { name: /listing.example/i })).toHaveAttribute(
      "href",
      "https://listing.example/t3",
    );
  });

  it("keeps the positional wording when no roles are passed (back-compat)", () => {
    render(<RoomQr roomId="r_9f3a" joinUrl={URL_} ownUrl={OWN_} />);
    expect(screen.getByText(/share this link so the other side can join/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /write your position/i })).not.toBeInTheDocument();
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
    expect(isLoopbackUrl("https://overlap.app/x")).toBe(false);
  });

  it("treats an unparseable URL as reachable rather than crashing the screen", () => {
    expect(isLoopbackUrl("not a url")).toBe(false);
  });
});
