/**
 * M6 · the prompt. See `docs/spec-02-evaluator.md`.
 *
 * This is the only text that crosses into the enclave, and its shape decides what
 * can come back out. Two rules govern every line of it:
 *
 *   1. Ask for ONE token from a closed set. Not "explain briefly, then answer" —
 *      any invitation to prose is an invitation to leak (D9).
 *   2. Never ask the model to name a dimension. It counts them internally; the
 *      count is the disclosure ceiling (D9 as amended).
 *
 * The prompt is built deterministically so the same inputs produce the same bytes.
 * That matters beyond tidiness: the 0G signature covers a hash derived from the
 * request, so a prompt that varied run to run would make the attestation harder
 * to reason about (spec-03 §8.1).
 */
import { USE_CASES, type UseCaseId } from "../session/usecases";

import { VERDICTS, type GapConsent, bothConsented } from "./verdict";

/**
 * What the model is allowed to answer, spelled out.
 *
 * Note the vocabulary shown to the model DEPENDS on consent: when gap disclosure
 * was not agreed by both sides, the `gap:*` values are not merely rejected on the
 * way out — they are never offered. Fewer ways to be non-compliant, and the model
 * is not asked to compute something it must not report.
 */
export function allowedVerdicts(consent: GapConsent): readonly string[] {
  return bothConsented(consent) ? VERDICTS : VERDICTS.filter((v) => !v.startsWith("gap:"));
}

export interface PromptInput {
  /** Side A's position, plain language, verbatim. */
  positionA: string;
  /** Side B's position, plain language, verbatim. */
  positionB: string;
  useCase: UseCaseId;
  consent: GapConsent;
}

/**
 * The system message: role, vocabulary, and the counting rule.
 *
 * Positions go in the USER message, never here — a position injecting text that
 * reads like an instruction should be data the model is judging, not policy it is
 * following. Keeping the two apart is the cheap half of prompt-injection defence;
 * the expensive half is that the output is a closed enum, so a successful
 * injection still cannot produce prose.
 */
export function systemPrompt(input: PromptInput): string {
  const allowed = allowedVerdicts(input.consent);
  const hint = USE_CASES[input.useCase].evaluatorHint;

  const lines = [
    "You are a sealed evaluator in a confidential two-party negotiation.",
    "Two sides have each written their own position. Neither can see the other's.",
    "",
    hint,
    "",
    "Decide whether a deal is possible: does at least one set of terms exist that satisfies both positions?",
    "Judge only what the positions state. Do not invent terms, and do not assume flexibility that is not written.",
    "",
    `Answer with EXACTLY ONE of these values and nothing else: ${allowed.join(", ")}.`,
    "- workable: a deal is possible within both positions.",
    "- not_workable: no deal satisfies both.",
  ];

  if (bothConsented(input.consent)) {
    // Only describe the counting basis when the count may actually be reported.
    //
    // D9.2: the count is of independent ROOT issues. Without the dependence rule the
    // model inflates the count through derived terms — proven live 26 Jul: a CPCV set
    // as a percentage of an unagreed price turned one blocker (price) into
    // `gap:multiple`, while the same texts with an overlapping price were `workable`.
    // `gap:single` is the "one issue away — worth a call" signal; inflating it kills
    // the impulse the product exists to create.
    // D9.2: the count is of DIRECT CONTRADICTIONS between stated limits, nothing else.
    // The rule is deliberately categorical, not procedural: thinking is disabled on
    // this call (D-M6-1 — receiving the chain of thought is already the breach), so
    // the model cannot work through a counterfactual analysis; it can only pattern-
    // match. Proven live 26 Jul: with procedural rules ("would it still block if…")
    // one contradicted limit plus an open date range kept coming back gap:multiple,
    // killing the "one issue away — worth a call" signal the product exists for.
    lines.push(
      "- gap:single: no deal is possible, and the positions directly contradict on exactly one point.",
      "- gap:multiple: no deal is possible, and the positions directly contradict on more than one point.",
      "",
      "Count ONLY direct contradictions between stated limits: one side's maximum below the other side's minimum, or two stated requirements that cannot both hold.",
      "A flexible or open term — a range, an earliest possible date, an amount defined as a percentage of another amount — contradicts nothing by itself and is NEVER counted.",
      "Example: one side offers at most 100, a deposit of a given percentage, and can start from a certain date onwards; the other refuses below 150, requires at least that same deposit percentage, and sets outer date limits the first side's dates can fit inside. The amounts 100 and 150 directly contradict; the deposit matches; the open dates fit. The count is one: gap:single.",
      "Answer gap:multiple ONLY when you find two or more separate direct contradictions. If you find one contradiction and are unsure about the rest, the answer is gap:single.",
      "NEVER name a dimension, quote a term, or reveal any number.",
    );
  }

  lines.push(
    "",
    "Output no explanation, no reasoning, no punctuation, and no other words. One value only.",
  );

  return lines.join("\n");
}

/**
 * The user message: the two positions, delimited — in CANONICAL order, not seat order.
 *
 * Positions are sorted by their own bytes before being laid out. The verdict is
 * symmetric in the two positions, but the model is not: measured live (26 Jul, temp 0,
 * deterministic across repeated runs), the same pair of texts returned `gap:single` in
 * one seat order and `gap:multiple` in the other. Which side happened to create the
 * room must not influence the verdict — ordering by content removes that axis entirely,
 * and as a bonus the enclave cannot tell creator from joiner.
 *
 * Delimiters are here so the model can tell where one position ends even if a position
 * happens to contain a line that looks like a label. They are numbered, not lettered:
 * after canonicalisation "first" no longer means seat A.
 */
export function userPrompt(input: PromptInput): string {
  const a = input.positionA.trim();
  const b = input.positionB.trim();
  const [first, second] = a <= b ? [a, b] : [b, a];
  return [
    "<position_1>",
    first,
    "</position_1>",
    "",
    "<position_2>",
    second,
    "</position_2>",
  ].join("\n");
}

/** JSON-schema `response_format` — belt #1 (D11). Zod is belt #2. */
export function responseFormat(consent: GapConsent): Record<string, unknown> {
  return {
    type: "json_schema",
    json_schema: {
      name: "overlap_verdict",
      strict: true,
      schema: {
        type: "object",
        properties: { verdict: { type: "string", enum: [...allowedVerdicts(consent)] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    },
  };
}
