import { sideSchema } from "@/session";
import { JoinRoomPanel } from "@/components/web/join-room-panel";

/**
 * The QR/link destination: `/room/<roomId>?side=A|B`. Parses the side and renders the join
 * landing. (Next 16: `params`/`searchParams` are async.)
 */
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ side?: string }>;
}) {
  const { roomId } = await params;
  const { side: sideParam } = await searchParams;
  const parsed = sideSchema.safeParse(sideParam);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-8 px-6">
      <JoinRoomPanel roomId={roomId} side={parsed.success ? parsed.data : null} />
    </main>
  );
}
