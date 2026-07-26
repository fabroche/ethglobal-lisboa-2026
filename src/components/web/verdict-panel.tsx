import { cn } from "@/lib/utils";
import type { Verdict } from "@/session";
import type { RevealFailure } from "@/reveal/run-reveal";
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
/**
 * S3.18 — the gap sentences must not claim more than the enum guarantees.
 *
 * `gap:multiple` is ALSO the model's "I can't cleanly attribute this to one dimension"
 * value (D9 as amended, `spec-02-evaluator.md`), so "several issues block" asserted a fact
 * the enum does not carry — in a negotiation, that wrongly says "walk away" when the truth
 * may be one entangled issue and a phone call. "More than one thing is in the way" is true
 * in BOTH cases the enum covers, without asserting which.
 *
 * The subtitle states the restraint (both sides consented to the count — the dimension is
 * never named), so the terseness reads as protective rather than evasive.
 *
 * Tone hierarchy runs emerald → amber → orange → neutral: `gap:single` (amber) is the
 * hopeful outcome — one issue away, worth a call — and must read warmer than
 * `gap:multiple` (orange), which in turn must not be visually identical to `not_workable`
 * (neutral): it carries information both sides had to agree to reveal. Existing Tailwind
 * values on purpose — the semantic tokens belong to S4.8, not here.
 */
const GAP_SUBTITLE = "Both sides agreed to reveal how many. Never which.";

const VERDICT_META: Record<Verdict, { label: string; tone: string; sub?: string }> = {
  workable: { label: "Workable — a deal is possible", tone: "text-emerald-600 dark:text-emerald-400" },
  not_workable: { label: "Not workable — no deal", tone: "text-foreground" },
  "gap:single": {
    label: "No deal — one issue is in the way",
    tone: "text-amber-600 dark:text-amber-400",
    sub: GAP_SUBTITLE,
  },
  "gap:multiple": {
    label: "No deal — more than one thing is in the way",
    tone: "text-orange-600 dark:text-orange-400",
    sub: GAP_SUBTITLE,
  },
};

/** Why the reveal produced no verdict, as the poll reported it (S3.20). */
export interface BlockedInfo {
  blocked: RevealFailure;
  detail?: string;
}

/**
 * How each blocked reason renders (S3.20). Three shapes:
 * - `terminal` — polling has stopped; say why there is no verdict and will not be one.
 *   `attestation_invalid` is the loud one: it is the fail-closed guarantee WORKING, and a
 *   judge must be able to tell it from a hang.
 * - `waiting` — recoverable without our involvement (the missing side can still commit);
 *   no spinner, because nothing is running.
 * - `retrying` — transient; the spinner stays and the reason is named.
 */
const BLOCKED_META: Record<
  RevealFailure,
  { kind: "terminal" | "waiting" | "retrying"; title: string; body: string }
> = {
  attestation_invalid: {
    kind: "terminal",
    title: "No verdict — attestation failed",
    body:
      "The enclave's signature did not verify against our pinned key, so nothing was published. That is the fail-closed rule doing its job: no valid attestation, no verdict.",
  },
  missing_sealed_payload: {
    kind: "terminal",
    title: "This room can't resolve",
    body:
      "The sealed texts are no longer available — the server restarted between commit and reveal, and ciphertext is deliberately never stored durably. Open a new room.",
  },
  unseal_failed: {
    kind: "terminal",
    title: "This room can't resolve",
    body: "A sealed position couldn't be opened — wrong key or altered ciphertext. Nothing was judged.",
  },
  no_expiry: {
    kind: "terminal",
    title: "This room can't resolve",
    body: "No deadline was ever published for this room, so there is nothing to reveal.",
  },
  incomplete_commitments: {
    kind: "waiting",
    title: "Waiting for the other side",
    body:
      "The deadline has passed with only one side committed. If the other side still commits, this screen will pick it up.",
  },
  // The three transient ones: the reveal retries on the next poll, so the spinner stays.
  evaluation_failed: {
    kind: "retrying",
    title: "Revealing",
    body: "The last attempt didn't finish (the evaluation failed). It retries automatically.",
  },
  attestation_unavailable: {
    kind: "retrying",
    title: "Revealing",
    body:
      "The last attempt didn't finish (no signature could be fetched yet). It retries automatically — no signature, no verdict.",
  },
  publish_failed: {
    kind: "retrying",
    title: "Revealing",
    body: "The last attempt didn't finish (the topic write failed). It retries automatically.",
  },
  already_published: {
    kind: "retrying",
    title: "Revealing",
    body: "The verdict is on the topic — waiting for Mirror Node to serve it.",
  },
};

export interface VerdictPanelProps {
  /** `null` while the reveal hasn't fired / no verdict is on the topic yet. */
  verdict: Verdict | null;
  /** Why the reveal produced no verdict (S3.20); `null`/absent while none reported. */
  blocked?: BlockedInfo | null;
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

export function VerdictPanel({ verdict, blocked, deadlineReached, className }: VerdictPanelProps) {
  const meta = verdict ? VERDICT_META[verdict] : null;
  const blockedMeta = !meta && blocked ? BLOCKED_META[blocked.blocked] : null;
  const revealing = !meta && !blockedMeta && deadlineReached === true;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-2 rounded-xl border bg-card p-6 text-center text-card-foreground shadow-sm",
        blockedMeta?.kind === "terminal" && "border-red-300 dark:border-red-900",
        className,
      )}
    >
      {meta ? (
        <>
          <p className={cn("text-xl font-semibold tracking-tight", meta.tone)}>{meta.label}</p>
          {meta.sub ? <p className="text-sm text-muted-foreground">{meta.sub}</p> : null}
        </>
      ) : blockedMeta ? (
        <>
          <p
            className={cn(
              "flex items-center gap-2.5 text-xl font-semibold tracking-tight",
              blockedMeta.kind === "terminal"
                ? "text-red-600 dark:text-red-400"
                : "text-amber-600 dark:text-amber-400",
            )}
          >
            {blockedMeta.kind === "retrying" ? <Spinner /> : null}
            {blockedMeta.title}
          </p>
          <p className="text-sm text-muted-foreground">{blockedMeta.body}</p>
        </>
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
