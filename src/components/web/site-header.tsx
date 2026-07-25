import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * M8 `site-header` (S3.10). The one persistent chrome: a way home from every screen.
 *
 * Before this, all five pages were dead ends — the only way back was the browser's
 * back button or editing the URL.
 *
 * Deliberately minimal, and the omissions are the design:
 *
 * - **No room id, no breadcrumb, no "you are in r_a492…".** These screens get shared
 *   and screenshotted, and the header is the one element present in every capture.
 *   A room id there would leak which negotiation someone is in, to anyone glancing
 *   at the screen, on every single page.
 * - **No nav links besides home.** There are three destinations and two of them are
 *   reached by a link someone sent you. A menu would be ceremony.
 * - **A server component.** Only the theme toggle needs the client, so only the
 *   theme toggle gets it.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          aria-label="Seam — go to the start"
          className="text-base font-semibold tracking-tight underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Seam
        </Link>

        <ThemeToggle className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
    </header>
  );
}
