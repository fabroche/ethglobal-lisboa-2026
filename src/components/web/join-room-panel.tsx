import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Side } from "@/session";

export interface JoinRoomPanelProps {
  roomId: string;
  /** Side parsed from the join link; `null` if the link was missing/invalid a side. */
  side: Side | null;
  className?: string;
}

/**
 * M8 join landing (the QR/link destination `/room/[roomId]?side=…`). Confirms which room and
 * side you joined; the write+seal step (M2, S3.2) mounts here once the client seal exists.
 */
export function JoinRoomPanel({ roomId, side, className }: JoinRoomPanelProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col gap-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight">
          Join <span className="serif-accent text-primary">room</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          You’re joining as{" "}
          {side ? (
            <span className="font-medium text-foreground">Side {side}</span>
          ) : (
            <span className="font-medium text-destructive">an unknown side</span>
          )}
          .
        </p>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Room</dt>
          <dd className="truncate font-mono">{roomId}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Side</dt>
          <dd className="font-medium">{side ?? "—"}</dd>
        </div>
      </dl>

      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Next you’ll write your position and <span className="serif-accent">seal</span> it in your
        browser — it’s encrypted to the enclave before it ever leaves your device, so the other
        side never sees it. That step is being wired up.
      </p>

      <Link
        href={`/room/${roomId}/verdict`}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        View countdown and verdict
      </Link>
    </div>
  );
}
