import { cn } from "@/lib/utils";
import type { Verdict } from "@/session";

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
  className?: string;
}

export function VerdictPanel({ verdict, className }: VerdictPanelProps) {
  const meta = verdict ? VERDICT_META[verdict] : null;

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
