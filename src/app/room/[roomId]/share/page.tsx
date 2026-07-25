import Link from "next/link";
import { buildJoinUrl, sideSchema, USE_CASES, useCaseIdSchema } from "@/session";
import { env } from "@/config/env";
import { RoomQr } from "@/components/web/room-qr";
import { RememberRoom } from "@/components/web/remember-room";
import { bookmarkLabelSchema } from "@/lib/room-bookmarks";

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
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ uc?: string; me?: string; about?: string }>;
}) {
  const { roomId } = await params;
  const { uc, me, about } = await searchParams;

  // The creator DECLARES their side on the create form (`me`, default A). This decides
  // which link is theirs and which one the QR hands to the counterpart — the fix for the
  // live failure where a Buyer-creator used the "join" link themselves and both humans
  // entered side B. Validated, never trusted: it arrives from a URL and only routes.
  const mySide = sideSchema.safeParse(me).success ? (me as "A" | "B") : "A";
  const otherSide = mySide === "A" ? "B" : "A";
  const myUrl = buildJoinUrl(env.APP_URL, roomId, mySide);
  const theirUrl = buildJoinUrl(env.APP_URL, roomId, otherSide);

  // Set by the create redirect so the bookmark can carry a searchable label
  // (S3.11) and the screen can speak in roles. Validated rather than trusted.
  const label = bookmarkLabelSchema.safeParse(uc);
  const useCase = useCaseIdSchema.safeParse(uc);
  const labels = useCase.success ? USE_CASES[useCase.data].sideLabels : undefined;
  const aboutText = typeof about === "string" && about.trim() ? about.trim().slice(0, 200) : undefined;

  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center justify-center gap-6 px-6">
      {/* Saved here as well as on the join landing, because the creator may never
          click their own link — they came straight from /create. */}
      <RememberRoom roomId={roomId} side={mySide} {...(label.success ? { label: label.data } : {})} />
      <RoomQr
        roomId={roomId}
        joinUrl={theirUrl}
        ownUrl={myUrl}
        {...(labels
          ? { theirLabel: labels[otherSide], yourLabel: labels[mySide] }
          : {})}
        {...(aboutText ? { about: aboutText } : {})}
        writeUrl={`/room/${roomId}/write?side=${mySide}`}
      />
      <Link
        href="/create"
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Open another room
      </Link>
    </main>
  );
}
