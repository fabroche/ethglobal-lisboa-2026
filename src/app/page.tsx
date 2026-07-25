import Link from "next/link";

import { RecentRooms } from "@/components/web/recent-rooms";

export default function Home() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        ETHGlobal · Lisbon 2026
      </p>
      <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
        One line. <span className="serif-accent text-primary">No leaks.</span>
      </h1>
      <p className="text-pretty text-muted-foreground">
        Two sides write their terms; a model inside sealed hardware returns a single line —
        whether a deal is possible — without either side, or us, ever seeing the other’s.
      </p>
      <Link
        href="/create"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open a room
      </Link>

      {/* Renders nothing until this device has a room, so a first-time visitor
          sees the pitch and one button — not an empty list (S3.9). */}
      <RecentRooms className="mt-6 text-left" />
    </main>
  );
}
