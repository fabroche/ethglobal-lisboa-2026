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
    lines.push(
      "- gap:single: no deal is possible, and exactly one dimension is responsible.",
      "- gap:multiple: no deal is possible, and either several dimensions block or the tradeoffs between them cannot be attributed to one.",
      "",
      "Assess the dimensions internally to reach the count. NEVER name a dimension, quote a term, or reveal any number.",
      "If you cannot cleanly attribute the failure to exactly one dimension, answer gap:multiple.",
    );
  }

  lines.push(
    "",
    "Output no explanation, no reasoning, no punctuation, and no other words. One value only.",
  );

  return lines.join("\n");
}

/**
 * The user message: the two positions, labelled and delimited.
 *
 * Delimiters are here so the model can tell where A ends and B begins even if a
 * position happens to contain a line that looks like a label.
 */
export function userPrompt(input: PromptInput): string {
  return [
    "<position_a>",
    input.positionA.trim(),
    "</position_a>",
    "",
    "<position_b>",
    input.positionB.trim(),
    "</position_b>",
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
