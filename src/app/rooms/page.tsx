import Link from "next/link";

import { RecentRooms } from "@/components/web/recent-rooms";

/**
 * `/rooms` — the full list of rooms this device remembers, with search and a side
 * filter (S3.11).
 *
 * Everything here is client-side: the list lives in `localStorage`, so this page
 * ships no data of its own and there is nothing for the server to know about which
 * rooms you have open. The empty state is passed *into* `RecentRooms` rather than
 * rendered here, so it appears only once the store has actually answered — a
 * server-rendered "no rooms" would flash at everyone, including people who have
 * plenty.
 *
 * It earns its keep as of S3.12: the navbar now links here unconditionally, so the
 * first person to click it will be someone who has never opened a room.
 */
export const metadata = { title: "Your rooms · Overlap" };

export default function RoomsPage() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full max-w-md flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Your rooms</h1>
        <p className="text-sm text-muted-foreground">
          Rooms this browser has opened. Search by deal type or room id.
        </p>
      </div>

      <RecentRooms
        searchable
        emptyState={
          <p
            role="status"
            className="w-full max-w-md rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground"
          >
            No rooms on this browser yet. Rooms you open — or join from a link someone sends you —
            show up here.
          </p>
        }
      />

      <Link
        href="/create"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open another room →
      </Link>
    </main>
  );
}
