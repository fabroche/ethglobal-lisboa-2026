/**
 * M6 · the output vocabulary and the consent gate. See `docs/spec-02-evaluator.md`.
 *
 * This file is the leak control (D9). Everything the enclave is allowed to say
 * lives here, as a closed set, so there is exactly one place to audit when
 * someone asks "what can this thing reveal?".
 *
 * The answer: one of four values, and never a character of free text.
 */
import { z } from "zod";

/**
 * The complete, closed output vocabulary (D9 as amended 25 Jul).
 *
 * `gap:*` says **how many** dimensions block, never **which**. The dimensions
 * themselves — compensation, timing, scope — exist only inside the enclave as the
 * counting basis and never appear in a published message.
 *
 * Naming the blocking dimension was rejected, and the reason is worth keeping
 * next to the code: "the single blocking dimension" is ill-defined when several
 * block at once or when tradeoffs entangle them, so any forced pick would
 * fabricate an answer — and it would leak strictly more than a count.
 */
export const VERDICTS = ["workable", "not_workable", "gap:single", "gap:multiple"] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Belt #2 (D11). The router's `response_format` is belt #1; neither is trusted alone. */
export const verdictSchema = z.enum(VERDICTS);

/** The `gap:*` subset — a refinement of `not_workable`, never of `workable`. */
export const GAP_VERDICTS = ["gap:single", "gap:multiple"] as const satisfies readonly Verdict[];
export type GapVerdict = (typeof GAP_VERDICTS)[number];

export function isGapVerdict(verdict: Verdict): verdict is GapVerdict {
  return (GAP_VERDICTS as readonly string[]).includes(verdict);
}

/** Per-side opt-in. Absent ⇒ not consented; there is no "default yes". */
export interface GapConsent {
  a: boolean;
  b: boolean;
}

export function bothConsented(consent: GapConsent): boolean {
  return consent.a === true && consent.b === true;
}

/**
 * Enforce two-sided consent on the model's output.
 *
 * The prompt already asks for a bare verdict when consent is missing, but a
 * prompt is a request, not a guarantee: models do not always comply, and this is
 * a privacy boundary rather than a formatting preference. So the rule is enforced
 * on the way out, where compliance is not required — defence in depth.
 *
 * A withheld gap DEGRADES to `not_workable` rather than erroring. `gap:*` means
 * "not workable, and here is how concentrated the problem is", so dropping the
 * refinement leaves a verdict that is still true — just less informative. Failing
 * the whole evaluation instead would punish both sides for the fact that one of
 * them declined to share more, which is exactly the choice we promised to honour.
 */
export function applyConsent(verdict: Verdict, consent: GapConsent): Verdict {
  if (!isGapVerdict(verdict)) return verdict;
  return bothConsented(consent) ? verdict : "not_workable";
}
