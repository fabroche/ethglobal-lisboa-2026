import type { CommitmentMessage, Side } from "./messages";

/**
 * S2.8 (P0) — derive two-sided gap consent from the topic, for `evaluate()` (M6).
 *
 * Consent comes from the TWO COMMITMENT MESSAGES, never from the create form (which is
 * only Side A's prefill). Fail-safe in every direction (D9 as amended):
 *  - a side with no commitment on the topic has NOT consented;
 *  - a legacy commitment without the field parses as `gapOptIn: false` (schema default);
 *  - if a side somehow has multiple commitments, ALL of them must carry `true` — a
 *    forged or stale duplicate can only downgrade to the bare verdict, never upgrade
 *    to disclosure.
 *
 * Shape matches the evaluator's `GapConsent` (`{ a, b }`, structural — the types unify
 * when the evaluator branch merges): "absent ⇒ not consented; there is no default yes."
 */
export interface GapConsent {
  a: boolean;
  b: boolean;
}

function sideConsented(commitments: CommitmentMessage[], side: Side): boolean {
  const own = commitments.filter((c) => c.side === side);
  return own.length > 0 && own.every((c) => c.gapOptIn === true);
}

/** Feed with `SessionView.commitments` (registry read, M4). */
export function consentFromCommitments(commitments: CommitmentMessage[]): GapConsent {
  return {
    a: sideConsented(commitments, "A"),
    b: sideConsented(commitments, "B"),
  };
}
