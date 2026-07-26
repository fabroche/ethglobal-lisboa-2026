// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { Countdown, formatRemaining } from "./countdown";

describe("formatRemaining", () => {
  it("formats days/hours/minutes/seconds, dropping leading zero units", () => {
    expect(formatRemaining(0)).toBe("0s");
    expect(formatRemaining(45 * 1000)).toBe("45s");
    expect(formatRemaining((3 * 60 + 5) * 1000)).toBe("3m 5s");
    expect(formatRemaining((26 * 3600 + 1) * 1000)).toBe("1d 2h 0m 1s");
  });

  it("never goes negative", () => {
    expect(formatRemaining(-5000)).toBe("0s");
  });
});

describe("Countdown", () => {
  it("shows 'Reveal due' once the deadline has passed", async () => {
    render(<Countdown deadlineIso="2000-01-01T00:00:00Z" />);
    expect(await screen.findByText(/reveal due/i)).toBeInTheDocument();
  });

  it("counts down toward a future deadline", async () => {
    render(<Countdown deadlineIso="2099-01-01T00:00:00Z" />);
    expect(await screen.findByText(/reveal in/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/\d+d/)).toBeInTheDocument());
  });
});
