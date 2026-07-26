// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { UseCasePicker } from "./use-case-picker";

describe("UseCasePicker", () => {
  it("renders the three presets as a radio group with the value checked", () => {
    render(<UseCasePicker value="property" onChange={vi.fn()} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /property sale/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /otc trade/i })).not.toBeChecked();
  });

  it("shows the side labels on each card", () => {
    render(<UseCasePicker value="property" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /employer · candidate/i })).toBeInTheDocument();
  });

  it("reports a pick without submitting the surrounding form", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <UseCasePicker value="property" onChange={onChange} />
      </form>,
    );
    fireEvent.click(screen.getByRole("radio", { name: /job offer/i }));
    expect(onChange).toHaveBeenCalledWith("job");
    // type="button" — picking a card must never submit the create form.
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
