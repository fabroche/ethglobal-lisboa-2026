import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { OverlapMark } from "./overlap-mark";

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
 * - **Two links, and only two.** Home, and `/rooms` (S3.12) — the list was otherwise
 *   reachable only through a "See all N rooms" link that renders when the landing
 *   page truncates it, so with one to three rooms there was no route to it at all
 *   short of typing the URL.
 * - **The Rooms link is unconditional**, and that is the privacy call, not a
 *   shortcut. Showing it only when this device has bookmarks would make the header
 *   itself report that someone here has negotiations open — on every page and in
 *   every screenshot, to a person who cannot see the list. The word "Rooms" alone
 *   says nothing; its *presence or absence* would say something. No count either,
 *   for the same reason.
 * - **A server component.** Only the theme toggle needs the client, so only the
 *   theme toggle gets it — a conditional link would have moved the whole header to
 *   the client and made it flicker in after hydration.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          aria-label="Overlap, go to the start"
          className="flex items-center gap-2 text-base font-semibold tracking-tight underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <OverlapMark />
          Overlap
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href="/rooms"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Rooms
          </Link>

          <ThemeToggle className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" />
        </nav>
      </div>
    </header>
  );
}
