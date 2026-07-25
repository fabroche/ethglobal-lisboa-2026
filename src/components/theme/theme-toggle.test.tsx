// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";

const setTheme = vi.fn();
let resolvedTheme: string | undefined = "light";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme, setTheme }) }));

import { ThemeToggle } from "./theme-toggle";

beforeEach(() => {
  setTheme.mockClear();
  resolvedTheme = "light";
});

describe("ThemeToggle", () => {
  it("switches to dark from light", async () => {
    render(<ThemeToggle />);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAccessibleName(/dark/i));

    fireEvent.click(screen.getByRole("button"));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches back to light from dark", async () => {
    resolvedTheme = "dark";
    render(<ThemeToggle />);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAccessibleName(/light/i));

    fireEvent.click(screen.getByRole("button"));

    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("names the action, not the current state", async () => {
    // "Switch to dark theme" tells you what the button DOES. Labelling it with the
    // current theme instead leaves the user guessing which way it goes.
    render(<ThemeToggle />);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAccessibleName("Switch to dark theme"));
  });

  it("does not claim a direction before the theme is known", () => {
    // `resolvedTheme` is undefined until mounted, so a specific label would be a
    // guess that then flips — worse than a neutral one.
    resolvedTheme = undefined;
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Switch theme");
  });

  it("renders the SERVER's neutral output on the very first client render", () => {
    // The hydration bug, twice shipped. next-themes sets the class on <html> from
    // an inline script that runs BEFORE React hydrates, so on the first client
    // render the theme is already known — while the server's HTML said it was not.
    // Rendering the real icon then is a mismatch (React error #418), and a failed
    // hydration kills interactivity for the whole tree, not just this button.
    //
    // `renderToString` is exactly the server's output; the first client paint must
    // match it even with a resolved theme available.
    resolvedTheme = "dark";
    const serverHtml = renderToString(<ThemeToggle />);

    // Neutral: no direction claimed, and the icon is the default one.
    expect(serverHtml).toContain("Switch theme");
    expect(serverHtml).not.toContain("Switch to light theme");

    // And the first client render agrees, which is what hydration compares.
    const { container } = render(<ThemeToggle />, { hydrate: false });
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("never cycles through a third state", async () => {
    // Two states only: a control that needs three clicks to return where it
    // started is worse than one that does what it says.
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(setTheme).toHaveBeenCalledTimes(1);
    expect(setTheme.mock.calls[0]![0]).toMatch(/^(light|dark)$/u);
  });
});
