// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareButton } from "./share-button";

const URL_ = "https://overlap.app/room/r_1?side=A";

function withNativeShare(share = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, "share", { value: share, configurable: true });
  return share;
}

function withoutNativeShare() {
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
}

afterEach(() => {
  withoutNativeShare();
});

describe("ShareButton", () => {
  it("uses the native share sheet when the Web Share API exists", async () => {
    const share = withNativeShare();
    render(<ShareButton url={URL_} roleLabel="Seller" />);

    fireEvent.click(await screen.findByRole("button", { name: /send to the seller/i }));

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: "Overlap room",
        text: `Join our Overlap room as the Seller: ${URL_}`,
        url: URL_,
      }),
    );
  });

  it("survives the user closing the sheet (no error surfaced)", async () => {
    withNativeShare(vi.fn().mockRejectedValue(new Error("AbortError")));
    render(<ShareButton url={URL_} roleLabel="Seller" />);
    fireEvent.click(await screen.findByRole("button", { name: /send to the seller/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("falls back to a direct-link menu without the API", async () => {
    withoutNativeShare();
    render(<ShareButton url={URL_} roleLabel="Candidate" />);

    const toggle = await screen.findByRole("button", { name: /send to the candidate/i });
    fireEvent.click(toggle);

    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
    expect(screen.getByRole("link", { name: /telegram/i })).toHaveAttribute(
      "href",
      expect.stringContaining("t.me/share"),
    );
    expect(screen.getByRole("link", { name: /email/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  it("the prefilled text carries role + link, never a deal type", async () => {
    withoutNativeShare();
    render(<ShareButton url={URL_} roleLabel="Seller" />);
    fireEvent.click(await screen.findByRole("button", { name: /send to the seller/i }));
    const wa = screen.getByRole("link", { name: /whatsapp/i }).getAttribute("href")!;
    expect(decodeURIComponent(wa)).toContain("as the Seller");
    expect(decodeURIComponent(wa)).not.toMatch(/property|job|otc/i);
  });
});
