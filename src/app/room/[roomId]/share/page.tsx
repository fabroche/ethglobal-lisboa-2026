import Link from "next/link";
import { buildJoinUrl } from "@/session";
import { env } from "@/config/env";
import { RoomQr } from "@/components/web/room-qr";

/**
 * Share/QR view: `/room/<roomId>/share`. A stable URL for a room's join QR + link (the QR the
 * create screen shows inline lives only in that page's state, so this gives it a permanent home
 * and a target for the verdict screen's "back" button). Rebuilds the join URL from the room id.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const joinUrl = buildJoinUrl(env.APP_URL, roomId, "B");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-6">
      <RoomQr roomId={roomId} joinUrl={joinUrl} />
      <Link
        href="/create"
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Open another room
      </Link>
    </main>
  );
}
