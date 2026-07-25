// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareButton } from "./share-button";

const URL_ = "https://overlap.app/room/r_1?side=A";

describe("ShareButton (per-app share links, uniform on every platform)", () => {
  it("primary action is a direct WhatsApp link carrying the full invite text", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" />);

    const wa = screen.getByRole("link", { name: /send via whatsapp to the seller/i });
    const href = decodeURIComponent(wa.getAttribute("href")!);
    expect(href).toContain("wa.me");
    expect(href).toContain("I'd like to check whether there's a deal here at all");
    expect(href).toContain(`Your link (you'd be the Seller): ${URL_}`);
  });

  it("weaves the room's public deadline into the message when known", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" deadlineIso="2026-07-26T08:00:00Z" />);
    const href = decodeURIComponent(
      screen.getByRole("link", { name: /send via whatsapp/i }).getAttribute("href")!,
    );
    expect(href).toContain("the deadline is");
  });

  it("More options reveals Telegram and Email share links", () => {
    render(<ShareButton url={URL_} roleLabel="Candidate" />);

    fireEvent.click(screen.getByRole("button", { name: /more options/i }));

    expect(screen.getByRole("link", { name: /telegram/i })).toHaveAttribute(
      "href",
      expect.stringContaining("t.me/share"),
    );
    expect(screen.getByRole("link", { name: /email/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  it("the message never carries the deal type", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" />);
    const href = decodeURIComponent(
      screen.getByRole("link", { name: /send via whatsapp/i }).getAttribute("href")!,
    );
    expect(href).not.toMatch(/property|job offer|otc/i);
  });
});
