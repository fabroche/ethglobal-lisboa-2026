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
