import Link from "next/link";

import { RecentRooms } from "@/components/web/recent-rooms";

export default function Home() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        ETHGlobal · Lisbon 2026
      </p>
      <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
        Stop negotiating deals that were{" "}
        <span className="serif-accent text-primary">never possible</span>
      </h1>
      <p className="text-lg font-medium">
        One line. <span className="serif-accent text-primary">No leaks.</span>
      </p>
      <p className="text-pretty text-muted-foreground">
        Two sides write their terms in private. A model inside sealed hardware answers with a
        single line: whether a deal is possible. Neither side ever sees the other&apos;s terms.
      </p>
      <Link
        href="/create"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open a room
      </Link>

      {/* Renders nothing until this device has a room, so a first-time visitor
          sees the pitch and one button — not an empty list (S3.9). Truncated here:
          the landing page is the pitch, and the full searchable list is /rooms. */}
      <RecentRooms limit={3} moreHref="/rooms" className="mt-6 text-left" />
    </main>
  );
}
