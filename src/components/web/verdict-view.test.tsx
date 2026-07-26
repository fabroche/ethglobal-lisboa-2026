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

describe("VerdictView — deriving which wait we are in (S3.19)", () => {
  it("stays quiet while the deadline is in the future", async () => {
    render(<VerdictView deadlineIso="2099-01-01T00:00:00Z" initialVerdict={null} />);
    await waitFor(() => expect(screen.getByText(/reveal in/i)).toBeInTheDocument());
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("switches to the revealing state once the deadline has passed", async () => {
    render(<VerdictView deadlineIso="2020-01-01T00:00:00Z" initialVerdict={null} />);
    expect(await screen.findByTestId("spinner")).toBeInTheDocument();
    expect(screen.getByText(/revealing/i)).toBeInTheDocument();
  });

  it("does not spin when there is no deadline to reason about", async () => {
    // Mirror lag or a room that never published an expiry: we do not know, so we do not claim.
    render(<VerdictView initialVerdict={null} />);
    await waitFor(() => expect(screen.getByText(/sealed/i)).toBeInTheDocument());
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("shows the verdict, not a spinner, on a past-deadline room that already resolved", async () => {
    render(<VerdictView deadlineIso="2020-01-01T00:00:00Z" initialVerdict="gap:single" />);
    await waitFor(() => expect(screen.getByText(/one issue/i)).toBeInTheDocument());
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });
});
