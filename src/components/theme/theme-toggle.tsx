"use client";

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
 * Gating is on `resolvedTheme`, not on a `mounted` flag. It is `undefined` until
 * next-themes has read the preference — which covers the SSR pass and any later
 * moment we genuinely do not know — and keying off mount instead let the label
 * claim a direction while the theme was still unknown.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const known = resolvedTheme !== undefined;
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
