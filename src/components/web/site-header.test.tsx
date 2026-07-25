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
    expect(screen.getByRole("link", { name: /seam/i })).toHaveAttribute("href", "/");
  });

  it("carries the theme toggle, which had no UI before", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("button", { name: /switch to .* theme/i })).toBeInTheDocument();
  });

  it("is a banner landmark, so screen readers can skip it", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("shows no room id or breadcrumb", () => {
    // The header is in every screenshot and on every shared screen. A room id here
    // would leak which negotiation someone is in, on every page, to anyone looking.
    const { container } = render(<SiteHeader />);
    expect(container.textContent).not.toMatch(/r_|room/i);
  });
});
