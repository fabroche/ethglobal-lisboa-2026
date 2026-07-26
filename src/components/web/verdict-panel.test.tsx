// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { VerdictPanel } from "./verdict-panel";

describe("VerdictPanel", () => {
  it("shows a sealed/pending state when there is no verdict", () => {
    render(<VerdictPanel verdict={null} />);
    expect(screen.getByText(/sealed/i)).toBeInTheDocument();
    expect(screen.getByText(/awaiting the reveal/i)).toBeInTheDocument();
  });

  it("shows the workable verdict", () => {
    render(<VerdictPanel verdict="workable" />);
    expect(screen.getByText(/a deal is possible/i)).toBeInTheDocument();
  });

  it("shows not_workable as neutral 'no deal' (not an error)", () => {
    render(<VerdictPanel verdict="not_workable" />);
    expect(screen.getByText(/no deal/i)).toBeInTheDocument();
  });

  it("shows the gap count — never a dimension — when both sides opted in (D9 amended)", () => {
    render(<VerdictPanel verdict="gap:single" />);
    expect(screen.getByText(/one issue blocks/i)).toBeInTheDocument();
  });

  it("shows gap:multiple as several issues", () => {
    render(<VerdictPanel verdict="gap:multiple" />);
    expect(screen.getByText(/several issues block/i)).toBeInTheDocument();
  });
});

describe("VerdictPanel — the two waits are not the same wait (S3.19)", () => {
  it("does NOT spin before the deadline: nothing is running yet", () => {
    // A spinner here would claim work that is not occurring, and would spin for hours.
    // The countdown above the panel is the honest indicator for this state.
    render(<VerdictPanel verdict={null} deadlineReached={false} />);
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(screen.getByText(/awaiting the reveal/i)).toBeInTheDocument();
  });

  it("spins once the deadline has passed, because the reveal is genuinely running", () => {
    render(<VerdictPanel verdict={null} deadlineReached />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.getByText(/revealing/i)).toBeInTheDocument();
  });

  it("stops spinning the moment a verdict exists", () => {
    render(<VerdictPanel verdict="workable" deadlineReached />);
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(screen.getByText(/a deal is possible/i)).toBeInTheDocument();
  });

  it("falls back to the quiet state when the clock is unknown (server render)", () => {
    // `undefined` is what the server passes. Rendering a spinner there and removing it on
    // hydration is a mismatch — and a flash of "Revealing" on a room days from its deadline.
    render(<VerdictPanel verdict={null} />);
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("keeps the spinner out of the accessibility tree — the text carries the meaning", () => {
    render(<VerdictPanel verdict={null} deadlineReached />);
    expect(screen.getByTestId("spinner")).toHaveAttribute("aria-hidden", "true");
    // The live region is what a screen reader announces, and it says a word, not "spinner".
    expect(screen.getByRole("status")).toHaveTextContent(/revealing/i);
  });

  it("explains that a failed attestation publishes nothing — while the user is waiting for it", () => {
    // The one moment the fail-closed guarantee is worth stating is the moment it is being
    // exercised. It is also the screen a judge is looking at during the demo.
    render(<VerdictPanel verdict={null} deadlineReached />);
    expect(screen.getByText(/no verdict is written at all/i)).toBeInTheDocument();
  });
});

describe("VerdictPanel — blocked states (S3.20)", () => {
  it("says an invalid attestation out loud: it is fail-closed working, not a hang", () => {
    render(
      <VerdictPanel verdict={null} deadlineReached blocked={{ blocked: "attestation_invalid" }} />,
    );
    expect(screen.getByText(/attestation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/no valid attestation, no verdict/i)).toBeInTheDocument();
    // Terminal: nothing is running, so nothing may spin.
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("terminal reasons beat the revealing spinner even after the deadline", () => {
    render(
      <VerdictPanel
        verdict={null}
        deadlineReached
        blocked={{ blocked: "missing_sealed_payload" }}
      />,
    );
    expect(screen.getByText(/can't resolve/i)).toBeInTheDocument();
    expect(screen.queryByText(/^revealing$/i)).not.toBeInTheDocument();
  });

  it("a transient reason keeps the spinner and names what failed", () => {
    render(
      <VerdictPanel verdict={null} deadlineReached blocked={{ blocked: "publish_failed" }} />,
    );
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.getByText(/topic write failed/i)).toBeInTheDocument();
  });

  it("an incomplete room waits without a spinner — nothing is running", () => {
    render(
      <VerdictPanel verdict={null} deadlineReached blocked={{ blocked: "incomplete_commitments" }} />,
    );
    expect(screen.getByText(/waiting for the other side/i)).toBeInTheDocument();
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("a verdict always wins over a stale blocked reason", () => {
    render(
      <VerdictPanel verdict="workable" blocked={{ blocked: "attestation_invalid" }} />,
    );
    expect(screen.getByText(/a deal is possible/i)).toBeInTheDocument();
    expect(screen.queryByText(/attestation failed/i)).not.toBeInTheDocument();
  });
});
