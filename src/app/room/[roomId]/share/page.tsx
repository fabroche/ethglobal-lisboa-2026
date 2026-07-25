import Link from "next/link";
import { buildJoinUrl, sideSchema, USE_CASES, useCaseIdSchema, type UseCaseId } from "@/session";
import { env, requireEnv } from "@/config/env";
import { createReader, hederaMirrorClient } from "@/registry";
import { ShareView } from "@/components/web/share-view";
import { bookmarkLabelSchema } from "@/lib/room-bookmarks";

/**
 * Share/QR view: `/room/<roomId>/share`. The landing the create flow redirects to (S3.8), so a
 * reload no longer destroys the room's links the way the create form's local state did.
 *
 * Context sources, in order of durability (root-caused Sat night — "← Back to QR" is a BARE
 * `/share` link, so query-only context produced the old wrong view):
 *  - deal type + about: the TOPIC's expiry message (Mirror), with the redirect query as the
 *    fast path for the seconds before Mirror indexes a fresh room;
 *  - the viewer's side: the redirect query right after creation, else the device bookmark
 *    (resolved client-side in ShareView).
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

  const urlA = buildJoinUrl(env.APP_URL, roomId, "A");
  const urlB = buildJoinUrl(env.APP_URL, roomId, "B");

  // Durable context from the topic; query params cover the Mirror-lag window.
  let topicUseCase: UseCaseId | undefined;
  let topicAbout: string | undefined;
  try {
    const topicId = requireEnv("HEDERA_TOPIC_ID");
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    topicUseCase = view.expiry?.useCase;
    topicAbout = view.expiry?.about;
  } catch {
    // Env missing / Mirror lag — fall back to the redirect query below.
  }

  const queryUc = useCaseIdSchema.safeParse(uc);
  const useCase = topicUseCase ?? (queryUc.success ? queryUc.data : undefined);
  const labels = useCase ? USE_CASES[useCase].sideLabels : undefined;
  const aboutText =
    topicAbout ??
    (typeof about === "string" && about.trim() ? about.trim().slice(0, 200) : undefined);

  // Declared side (creator redirect). Validated, never trusted — it arrives from a URL
  // and only routes; seats are protected by World Selfie Check, not by links.
  const queryMe = sideSchema.safeParse(me);
  const label = bookmarkLabelSchema.safeParse(useCase ?? uc);

  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col items-center justify-center gap-6 px-6">
      <ShareView
        roomId={roomId}
        urlA={urlA}
        urlB={urlB}
        {...(labels ? { labels } : {})}
        {...(aboutText ? { about: aboutText } : {})}
        {...(queryMe.success ? { queryMe: queryMe.data } : {})}
        {...(label.success ? { bookmarkLabel: label.data } : {})}
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
