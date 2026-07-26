// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

// next-themes needs a provider; the toggle's own behaviour is covered in its test.
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }) }));

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("gives every page a way home", () => {
    // The reason this component exists: all five pages were dead ends.
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: /overlap/i })).toHaveAttribute("href", "/");
  });

  it("carries the theme toggle, which had no UI before", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("button", { name: /switch to .* theme/i })).toBeInTheDocument();
  });

  it("is a banner landmark, so screen readers can skip it", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("links to the room list, which was otherwise unreachable", () => {
    // Before S3.12 the only route to /rooms was a "See all N rooms" link that renders
    // only when the landing page truncates the list — so with one to three rooms
    // there was no way in at all.
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: /^rooms$/i })).toHaveAttribute("href", "/rooms");
  });

  it("shows the Rooms link even when this device remembers no rooms", () => {
    // Unconditional on purpose (S3.12): a link that appeared only once you had rooms
    // would report, on every page and in every screenshot, that someone here has
    // negotiations open — to a person who cannot see the list itself.
    window.localStorage.clear();
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: /^rooms$/i })).toBeInTheDocument();
  });

  it("shows no room id, no breadcrumb and no count", () => {
    // The header is in every screenshot and on every shared screen. A room id here
    // would leak which negotiation someone is in, on every page, to anyone looking.
    // The word "Rooms" is safe — a closed label. An id or a number is not.
    const { container } = render(<SiteHeader />);
    expect(container.textContent).not.toMatch(/r_|\d/);
    expect(container.textContent).not.toMatch(/room [0-9a-f]/i);
  });
});
