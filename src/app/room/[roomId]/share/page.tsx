import Link from "next/link";
import { buildJoinUrl } from "@/session";
import { env } from "@/config/env";
import { RoomQr } from "@/components/web/room-qr";
import { RememberRoom } from "@/components/web/remember-room";

/**
 * Share/QR view: `/room/<roomId>/share`. The landing the create flow redirects to (S3.8), so a
 * reload no longer destroys the room's links the way the create form's local state did.
 *
 * Both links are rebuilt from the room id — nothing is stored. Note that makes them PUBLIC by
 * construction: `buildJoinUrl` is deterministic, so anyone holding the room id can derive either
 * side's URL. The `side` parameter routes, it does not authorise; what protects a seat is World
 * Selfie Check (one per side, per room), and the UI must not imply the URL is a credential.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const joinUrl = buildJoinUrl(env.APP_URL, roomId, "B");
  const ownUrl = buildJoinUrl(env.APP_URL, roomId, "A");

  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center justify-center gap-6 px-6">
      {/* You reach this page by creating the room, so you are side A (S3.9).
          Saved here as well as on the join landing, because the creator may never
          click their own link — they came straight from /create. */}
      <RememberRoom roomId={roomId} side="A" />
      <RoomQr roomId={roomId} joinUrl={joinUrl} ownUrl={ownUrl} />
      <Link
        href="/create"
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Open another room
      </Link>
    </main>
  );
}
