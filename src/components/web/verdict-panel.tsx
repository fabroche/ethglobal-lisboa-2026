import { cn } from "@/lib/utils";
import type { Verdict } from "@/session";
import { Spinner } from "./spinner";

/**
 * M8 `verdict-panel` — the one line. Shows a pending (sealed, awaiting reveal) state until a
 * verdict is on the topic, then the enum verdict. `not_workable` is deliberately neutral, not
 * alarming red — it's "no deal", not an error (design-system rule).
 *
 * NOTE: uses Tailwind's built-in emerald/amber/neutral because the semantic verdict tokens
 * (`--workable` / `--not-workable` / `--pending`) aren't defined in globals.css yet. Migrate to
 * those tokens once the integrator adds them.
 */
const VERDICT_META: Record<Verdict, { label: string; tone: string }> = {
  workable: { label: "Workable — a deal is possible", tone: "text-emerald-600 dark:text-emerald-400" },
  not_workable: { label: "Not workable — no deal", tone: "text-foreground" },
  "gap:single": { label: "No deal — one issue blocks", tone: "text-amber-600 dark:text-amber-400" },
  "gap:multiple": { label: "No deal — several issues block", tone: "text-foreground" },
};

export interface VerdictPanelProps {
  /** `null` while the reveal hasn't fired / no verdict is on the topic yet. */
  verdict: Verdict | null;
  /**
   * Has the publicly committed deadline passed? (S3.19)
   *
   * This splits the one "pending" state into the two things it was conflating, and the
   * split is the whole point of the loading state:
   *
   * - `false` — **nothing is happening yet.** Positions are sealed and the clock is
   *   running. A spinner here would claim work that is not occurring, and would spin for
   *   hours or days. The countdown above is the honest indicator.
   * - `true` — **the reveal is genuinely running.** The first reader past the deadline
   *   triggers it (S2.9): enclave call, attestation check, topic write, then Mirror has to
   *   index it. That is real seconds, and without a spinner "working" and "hung" look
   *   identical — which is exactly the wrong ambiguity to have on screen while a judge
   *   watches.
   *
   * `undefined` while the client has not established the time yet (server render), so it
   * falls back to the quiet state and there is no hydration mismatch.
   */
  deadlineReached?: boolean | undefined;
  className?: string;
}

export function VerdictPanel({ verdict, deadlineReached, className }: VerdictPanelProps) {
  const meta = verdict ? VERDICT_META[verdict] : null;
  const revealing = !meta && deadlineReached === true;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-2 rounded-xl border bg-card p-6 text-center text-card-foreground shadow-sm",
        className,
      )}
    >
      {meta ? (
        <p className={cn("text-xl font-semibold tracking-tight", meta.tone)}>{meta.label}</p>
      ) : revealing ? (
        <>
          <p className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
            <Spinner />
            Revealing
          </p>
          <p className="text-sm text-muted-foreground">
            The sealed positions are with the enclave. We check its signature before anything is
            published — if it doesn’t verify, no verdict is written at all.
          </p>
        </>
      ) : (
        <>
          <p className="text-xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
            Sealed
          </p>
          <p className="text-sm text-muted-foreground">
            Awaiting the reveal — the verdict appears here the moment it’s on the topic.
          </p>
        </>
      )}
    </div>
  );
}
