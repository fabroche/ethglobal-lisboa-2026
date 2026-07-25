// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { PositionChecklist } from "./position-checklist";

describe("PositionChecklist", () => {
  it("renders every guidance item", () => {
    render(<PositionChecklist items={["Price", "CPCV date"]} />);
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("CPCV date")).toBeInTheDocument();
  });

  it("presents itself as guidance, never a requirement (DA8)", () => {
    render(<PositionChecklist items={["Price"]} />);
    expect(screen.getByText(/nothing here is required/i)).toBeInTheDocument();
    // Purely presentational: no inputs, no validation surface.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
