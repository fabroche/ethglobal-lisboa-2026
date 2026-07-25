"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { USE_CASES, type Side, type UseCaseId } from "@/session";
import { UseCasePicker } from "./use-case-picker";

/** Format a Date as a `datetime-local` value (`YYYY-MM-DDTHH:mm`) in local time. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface CreateRoomResult {
  roomId: string;
  /** Side B's link — the one to share. */
  joinUrl: string;
  /** Side A's link — the creator's way back in (S3.8). */
  ownUrl?: string;
}

export interface CreateRoomFormProps {
  /** Server Action (M1 `createRoom`). Injected so the form is testable/story-able without Hedera. */
  createRoom: (
    deadlineIso: string,
    gapOptIn: boolean,
    useCase: UseCaseId,
    about?: string,
  ) => Promise<CreateRoomResult>;
  className?: string;
}

/**
 * M8 `create-room-form` (S3.1). Set a deadline and open a room; on success shows the join link
 * (RoomQr). Mobile-first: full-width, ≥44px targets. The deadline is validated future here and
 * again server-side in M1; the clock is published to Hedera before anyone writes.
 */
export function CreateRoomForm({ createRoom, className }: CreateRoomFormProps) {
  const [deadline, setDeadline] = useState("");
  const [useCase, setUseCase] = useState<UseCaseId>("property");
  // Which seat the CREATOR takes. Labels follow the selected preset; the letter persists
  // across preset switches (A stays A, only its name changes). Root cause of the
  // both-sides-were-Buyer failure: this question was never asked (creator was hardwired A).
  const [mySide, setMySide] = useState<Side>("A");
  const [about, setAbout] = useState("");
  const [gapOptIn, setGapOptIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Set the picker's floor to "now" after mount (avoids an SSR/client hydration mismatch —
  // computing it during render would differ between server and client).
  const [minDeadline, setMinDeadline] = useState("");
  useEffect(() => {
    // Derive "now" on the client after mount so the picker's min doesn't cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinDeadline(toLocalInputValue(new Date()));
  }, []);

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
      const result = await createRoom(
        parsed.toISOString(),
        gapOptIn,
        useCase,
        about.trim() || undefined,
      );
      // NAVIGATE, don't render inline (S3.8). The QR used to be shown from this
      // component's state, so a plain reload destroyed it: no URL, no history entry,
      // and no way back to a room that already exists on the topic. Pushing to
      // /share gives the room a real address — which also makes the browser's own
      // history a free recovery path.
      // `uc`/`me`/`about` ride along so the share screen can speak in roles (the
      // creator's declared side decides which link is theirs vs the counterpart's —
      // the fix for both humans entering side B) and show the context anchor. All on
      // the CREATOR's own redirect only — the join link they hand over carries just
      // the side.
      const q = new URLSearchParams({ uc: useCase, me: mySide });
      if (about.trim()) q.set("about", about.trim());
      router.push(`/room/${result.roomId}/share?${q.toString()}`);
      // `pending` deliberately stays true: navigation is in flight, and
      // re-enabling the button here would invite a second room being created —
      // which costs a Hedera message and leaves an orphan on the topic.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the room.");
      setPending(false);
    }
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

      <UseCasePicker value={useCase} onChange={setUseCase} />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">You are the…</legend>
        <div role="radiogroup" aria-label="Your side" className="flex gap-2">
          {(["A", "B"] as const).map((side) => (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={mySide === side}
              onClick={() => setMySide(side)}
              className={cn(
                "min-h-11 flex-1 rounded-full border px-3 text-sm transition",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                mySide === side
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-input bg-background hover:border-muted-foreground/40",
              )}
            >
              {USE_CASES[useCase].sideLabels[side]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        What’s this about?{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          type="text"
          name="about"
          value={about}
          maxLength={200}
          placeholder="Link or one line — e.g. the listing URL"
          onChange={(event) => setAbout(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-xs font-normal text-muted-foreground">
          Visible to both sides. Context only — <span className="font-semibold">never your terms.</span>
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Deadline
        <input
          type="datetime-local"
          name="deadline"
          value={deadline}
          min={minDeadline || undefined}
          onChange={(event) => setDeadline(event.target.value)}
          aria-invalid={error != null}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={gapOptIn}
          onChange={(event) => setGapOptIn(event.target.checked)}
          className="mt-0.5 size-4 accent-primary focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-muted-foreground">
          If there’s no deal, allow revealing whether one issue or several block it — never which.
          Both sides must opt in.
        </span>
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
