// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { VerdictView } from "./verdict-view";

describe("VerdictView", () => {
  it("renders the countdown when a deadline is given and the pending panel", () => {
    render(<VerdictView deadlineIso="2099-01-01T00:00:00Z" initialVerdict={null} />);
    expect(screen.getByText(/reveal in/i)).toBeInTheDocument();
    expect(screen.getByText(/sealed/i)).toBeInTheDocument();
  });

  it("shows the verdict immediately when one is already present", () => {
    render(<VerdictView initialVerdict="workable" />);
    expect(screen.getByText(/a deal is possible/i)).toBeInTheDocument();
  });

  it("polls and swaps the pending state for the verdict when it lands", async () => {
    const pollVerdict = vi.fn().mockResolvedValue("not_workable");
    render(<VerdictView initialVerdict={null} pollVerdict={pollVerdict} pollMs={10} />);
    expect(screen.getByText(/sealed/i)).toBeInTheDocument();
    expect(await screen.findByText(/no deal/i)).toBeInTheDocument();
  });
});
