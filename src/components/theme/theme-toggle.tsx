"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Light/dark toggle (S3.10). `ThemeProvider` was already wired with `enableSystem`,
 * so dark mode worked — it just could not be chosen. This is the missing UI.
 *
 * Two states only: light and dark. No "system" third step, because a control that
 * needs three clicks to get back where it started is worse than one that does what
 * it says. The provider still starts from the system preference; this overrides it
 * only once the user expresses one.
 *
 * ── WHY BOTH `mounted` AND `resolvedTheme` ──────────────────────────────────
 * They guard different failures, and I shipped a version with only one of each and
 * hit the other both times.
 *
 * `mounted` is for HYDRATION. next-themes sets the class on <html> from an inline
 * script that runs BEFORE React hydrates, so on the client's very first render the
 * theme is already known — while the server's HTML said it was not. Rendering the
 * real icon then is a mismatch (React error #418), and a failed hydration takes the
 * whole tree's interactivity with it, not just this button.
 *
 * `resolvedTheme !== undefined` is for TRUTHFULNESS. Once mounted it can still be
 * undefined, and keying the label off mount alone made it claim a direction it did
 * not know ("Switch to dark theme" without knowing the current theme).
 *
 * So: render neutral until mounted AND the theme is known. Both conditions, or one
 * of the two bugs comes back.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  // Deliberately not derived from `resolvedTheme`: the point is to match the
  // SERVER's output on the first client render, whatever the theme turns out to be.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const known = mounted && resolvedTheme !== undefined;
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // Names the ACTION, not the current state: "Switch to dark theme" tells you
      // where the button takes you, where "Dark theme" would leave you guessing.
      aria-label={known ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Switch theme"}
      className={className}
    >
      {known && isDark ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
    </button>
  );
}
