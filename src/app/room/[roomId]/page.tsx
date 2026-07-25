import { sideSchema } from "@/session";
import { JoinRoomPanel } from "@/components/web/join-room-panel";
import { RememberRoom } from "@/components/web/remember-room";

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
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center justify-center gap-8 px-6">
      {/* Only once we know which side you are — a bookmark without a side cannot
          rebuild the right link, and guessing would seat you wrongly (S3.9). */}
      {parsed.success ? <RememberRoom roomId={roomId} side={parsed.data} /> : null}
      <JoinRoomPanel roomId={roomId} side={parsed.success ? parsed.data : null} />
    </main>
  );
}
