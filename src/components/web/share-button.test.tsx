// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ShareButton } from "./share-button";

const URL_ = "https://overlap.app/room/r_1?side=A";

const hrefOf = (name: RegExp) =>
  decodeURIComponent(screen.getByRole("link", { name }).getAttribute("href")!);

describe("ShareButton (icon row of per-app share links)", () => {
  it("shows the three apps side by side, each with an accessible name", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" />);
    expect(screen.getByRole("link", { name: /share via whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /share via telegram/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /share via email/i })).toBeInTheDocument();
    expect(screen.getByText(/send the invite to the seller/i)).toBeInTheDocument();
  });

  it("EVERY app carries the full invite text (the Telegram short-text bug)", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" />);
    for (const name of [/whatsapp/i, /telegram/i, /email/i]) {
      expect(hrefOf(name)).toContain("I'd like to check whether there's a deal here at all");
    }
  });

  it("the link appears exactly ONCE per composed message (the double-link bug)", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" />);
    // WhatsApp/Email carry it in the text; Telegram carries it ONLY in its url param
    // (Telegram appends that itself — text with the link would show it twice).
    expect(hrefOf(/whatsapp/i).split(URL_).length - 1).toBe(1);
    expect(hrefOf(/email/i).split(URL_).length - 1).toBe(1);
    expect(hrefOf(/telegram/i).split(URL_).length - 1).toBe(1);
  });

  it("weaves the room's public deadline into the message when known", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" deadlineIso="2026-07-26T08:00:00Z" />);
    expect(hrefOf(/whatsapp/i)).toContain("the deadline is");
  });

  it("targets each app's official share endpoint", () => {
    render(<ShareButton url={URL_} roleLabel="Candidate" />);
    expect(hrefOf(/whatsapp/i)).toContain("wa.me");
    expect(hrefOf(/telegram/i)).toContain("t.me/share");
    expect(hrefOf(/email/i)).toContain("mailto:");
  });

  it("the message never carries the deal type", () => {
    render(<ShareButton url={URL_} roleLabel="Seller" />);
    expect(hrefOf(/whatsapp/i)).not.toMatch(/property|job offer|otc/i);
  });
});
