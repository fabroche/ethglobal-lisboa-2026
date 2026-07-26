// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { OverlapMark } from "./overlap-mark";

describe("OverlapMark", () => {
  it("renders an inline SVG themed through the brand tokens", () => {
    const { container } = render(<OverlapMark />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // The two sides + the seam, coloured by tokens so the mark themes light/dark.
    expect(container.innerHTML).toContain("var(--side-a)");
    expect(container.innerHTML).toContain("var(--side-b)");
    expect(container.innerHTML).toContain("var(--seam)");
  });

  it("is decorative — hidden from the accessibility tree (the wordmark names it)", () => {
    const { container } = render(<OverlapMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
