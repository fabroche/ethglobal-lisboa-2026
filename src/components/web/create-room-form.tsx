"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { RoomQr } from "./room-qr";

export interface CreateRoomResult {
  roomId: string;
  joinUrl: string;
}

export interface CreateRoomFormProps {
  /** Server Action (M1 `createRoom`). Injected so the form is testable/story-able without Hedera. */
  createRoom: (deadlineIso: string) => Promise<CreateRoomResult>;
  className?: string;
}

/**
 * M8 `create-room-form` (S3.1). Set a deadline and open a room; on success shows the join link
 * (RoomQr). Mobile-first: full-width, ≥44px targets. The deadline is validated future here and
 * again server-side in M1; the clock is published to Hedera before anyone writes.
 */
export function CreateRoomForm({ createRoom, className }: CreateRoomFormProps) {
  const [deadline, setDeadline] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<CreateRoomResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!deadline) {
      setError("Pick a deadline first.");
      return;
    }
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      setError("That deadline isn't a valid date.");
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      setError("The deadline must be in the future.");
      return;
    }

    setPending(true);
    try {
      const result = await createRoom(parsed.toISOString());
      setRoom(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the room.");
    } finally {
      setPending(false);
    }
  }

  if (room) {
    return <RoomQr roomId={room.roomId} joinUrl={room.joinUrl} className={className} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Create a negotiation room"
      className={cn(
        "flex w-full max-w-md flex-col gap-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Open a room</h2>
        <p className="text-sm text-muted-foreground">
          Set the deadline. It’s published to Hedera{" "}
          <span className="serif-accent">before</span> anyone writes a word.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Deadline
        <input
          type="datetime-local"
          name="deadline"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          aria-invalid={error != null}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "min-h-11 rounded-full bg-primary px-6 font-medium text-primary-foreground transition",
          "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        )}
      >
        {pending ? "Opening…" : "Open room"}
      </button>
    </form>
  );
}
