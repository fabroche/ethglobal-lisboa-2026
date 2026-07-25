import Link from "next/link";

import { RecentRooms } from "@/components/web/recent-rooms";

/**
 * `/rooms` — the full list of rooms this device remembers, with search and a side
 * filter (S3.11).
 *
 * Everything here is client-side: the list lives in `localStorage`, so this page
 * ships no data of its own and there is nothing for the server to know about which
 * rooms you have open. That is also why there is no empty-state fallback rendered
 * on the server — `RecentRooms` decides, once it has read the store.
 */
export const metadata = { title: "Your rooms · Seam" };

export default function RoomsPage() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full max-w-md flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Your rooms</h1>
        <p className="text-sm text-muted-foreground">
          Rooms this browser has opened. Search by deal type or room id.
        </p>
      </div>

      <RecentRooms searchable />

      <Link
        href="/create"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open another room →
      </Link>
    </main>
  );
}
