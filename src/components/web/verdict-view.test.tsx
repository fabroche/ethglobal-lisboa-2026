// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { VerdictView, formatRevealedAt, type VerdictReading } from "./verdict-view";

const PUBLISHED_AT = "2026-07-26T00:14:09Z";

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
    const pollVerdict = vi
      .fn<() => Promise<VerdictReading | null>>()
      .mockResolvedValue({ verdict: "not_workable", publishedAt: PUBLISHED_AT });
    render(<VerdictView initialVerdict={null} pollVerdict={pollVerdict} pollMs={10} />);
    expect(screen.getByText(/sealed/i)).toBeInTheDocument();
    expect(await screen.findByText(/no deal/i)).toBeInTheDocument();
  });
});

describe("VerdictView — polls must not overlap (S3.21a)", () => {
  it("does not fire a second poll while the previous one is still in flight", async () => {
    // The poll triggers the lazy reveal server-side, which takes much longer than pollMs.
    // A setInterval fires again mid-flight and stacks concurrent reveals — three enclave
    // calls for one room, proven on the topic. The loop must re-arm only after returning.
    let resolveFirst!: (v: VerdictReading | null) => void;
    const pollVerdict = vi
      .fn<() => Promise<VerdictReading | null>>()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValue({ verdict: "workable", publishedAt: PUBLISHED_AT });
    render(<VerdictView initialVerdict={null} pollVerdict={pollVerdict} pollMs={10} />);

    // Long enough for an interval-based poll to have fired several more times.
    await new Promise((r) => setTimeout(r, 80));
    expect(pollVerdict).toHaveBeenCalledTimes(1);

    resolveFirst(null);
    await waitFor(() => expect(pollVerdict).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/a deal is possible/i)).toBeInTheDocument();
  });

  it("keeps polling after a transient poll failure instead of stranding the screen", async () => {
    const pollVerdict = vi
      .fn<() => Promise<VerdictReading | null>>()
      .mockRejectedValueOnce(new Error("network hiccup"))
      .mockResolvedValue({ verdict: "workable", publishedAt: PUBLISHED_AT });
    render(<VerdictView initialVerdict={null} pollVerdict={pollVerdict} pollMs={10} />);
    expect(await screen.findByText(/a deal is possible/i)).toBeInTheDocument();
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

describe("VerdictView — a resolved room shows when, not a dead countdown (S3.22)", () => {
  it("replaces the countdown with the publish time once a verdict is present", () => {
    render(
      <VerdictView
        deadlineIso="2020-01-01T00:00:00Z"
        initialVerdict="not_workable"
        publishedAtIso={PUBLISHED_AT}
      />,
    );
    expect(screen.queryByText(/reveal due/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reveal in/i)).not.toBeInTheDocument();
    expect(screen.getByText(/revealed/i)).toBeInTheDocument();
    expect(screen.getByText("26 Jul 2026, 00:14 UTC")).toBeInTheDocument();
  });

  it("drops the countdown when the verdict lands via polling", async () => {
    const pollVerdict = vi
      .fn<() => Promise<VerdictReading | null>>()
      .mockResolvedValue({ verdict: "workable", publishedAt: PUBLISHED_AT });
    render(
      <VerdictView
        deadlineIso="2020-01-01T00:00:00Z"
        initialVerdict={null}
        pollVerdict={pollVerdict}
        pollMs={10}
      />,
    );
    expect(await screen.findByText(/a deal is possible/i)).toBeInTheDocument();
    expect(screen.queryByText(/reveal due/i)).not.toBeInTheDocument();
    expect(screen.getByText("26 Jul 2026, 00:14 UTC")).toBeInTheDocument();
  });

  it("shows no countdown and no publish time when publishedAt is missing", () => {
    // A verdict without a timestamp (defensive): the dead countdown must still not return.
    render(<VerdictView deadlineIso="2020-01-01T00:00:00Z" initialVerdict="workable" />);
    expect(screen.queryByText(/reveal due/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/revealed/i)).not.toBeInTheDocument();
  });
});

describe("formatRevealedAt", () => {
  it("formats in UTC so server and client render the same bytes", () => {
    expect(formatRevealedAt("2026-07-26T00:14:09Z")).toBe("26 Jul 2026, 00:14 UTC");
    expect(formatRevealedAt("2026-01-05T23:05:00+02:00")).toBe("5 Jan 2026, 21:05 UTC");
  });

  it("returns null for an unparseable instant instead of rendering garbage", () => {
    expect(formatRevealedAt("not-a-date")).toBeNull();
  });
});
