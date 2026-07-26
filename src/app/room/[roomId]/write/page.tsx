import Link from "next/link";
import { env, requireEnv } from "@/config/env";
import { createReader, hederaMirrorClient } from "@/registry";
import { sideSchema, USE_CASES, type UseCaseId } from "@/session";
import { SealPositionForm } from "@/components/web/seal-position-form";
import { submitCommitmentAction } from "./actions";

/**
 * Write+seal screen (M8 / S3.2): `/room/<roomId>/write?side=A|B`. Reads the room's expiry
 * from Mirror (for the use-case preset, D16); a room with no expiry on the topic can't be
 * written to (RNF-M1-001 — the clock is public before any position exists). Rooms from
 * before D16 carry no `useCase` and fall back to the property preset.
 */
export default async function WritePage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ side?: string }>;
}) {
  const { roomId } = await params;
  const { side: sideParam } = await searchParams;
  const side = sideSchema.safeParse(sideParam);

  let useCase: UseCaseId = "property";
  let about: string | undefined;
  let roomFound = false;
  let alreadyCommitted = false;
  try {
    const topicId = requireEnv("HEDERA_TOPIC_ID");
    const view = await createReader(hederaMirrorClient()).readSession(topicId, { roomId });
    roomFound = Boolean(view.expiry);
    useCase = view.expiry?.useCase ?? "property";
    about = view.expiry?.about;
    // S3.23 — a side that already committed must not be offered a blank form: they would
    // rewrite their whole position, pass the Selfie Check, seal — and only then be
    // rejected by the seat claim. The commitment on the topic is binding; say so up front.
    alreadyCommitted =
      side.success && view.commitments.some((c) => c.side === side.data);
  } catch {
    // Env missing / Mirror lag — render the not-found guidance below.
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-6 py-10">
      <nav className="flex w-full max-w-md items-center justify-between">
        <Link
          href={`/room/${roomId}${side.success ? `?side=${side.data}` : ""}`}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Room
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{roomId}</span>
      </nav>

      {!side.success ? (
        <p className="w-full max-w-md rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          This link is missing a valid side. Ask for the join link/QR again — it encodes your
          side (A or B) and nothing else.
        </p>
      ) : !roomFound ? (
        <p className="w-full max-w-md rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          No deadline is on the topic for this room yet, so nothing can be written — the clock
          must be public before any position exists. If the room was just created, Mirror Node
          may still be catching up; retry in a few seconds.
        </p>
      ) : alreadyCommitted ? (
        <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">
            You already sent your position
          </h1>
          <p className="text-sm text-muted-foreground">
            A sealed commitment for side {side.success ? side.data : ""} is on the public
            record for this room, and a position can&apos;t be rewritten once committed —
            that guarantee is what makes the verdict mean something. There is nothing left
            to do here but wait for the reveal.
          </p>
          <Link
            href={`/room/${roomId}/verdict`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go to the verdict →
          </Link>
        </div>
      ) : (
        <>
          {about ? (
            <p className="w-full max-w-md truncate text-xs text-primary" title={about}>
              About:{" "}
              {/^https?:\/\//.test(about) ? (
                <a href={about} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {about}
                </a>
              ) : (
                about
              )}
            </p>
          ) : null}
          <SealPositionForm
            roomId={roomId}
            side={side.data}
            preset={USE_CASES[useCase]}
            enclaveSealKey={env.OG_ENCLAVE_SEAL_PUBKEY ?? null}
            worldAppId={env.WORLD_APP_ID ?? null}
            {...(env.E2E_FAKE_WORLD ? { e2eBypass: true } : {})}
            submitCommitment={submitCommitmentAction}
          />
        </>
      )}
    </main>
  );
}
