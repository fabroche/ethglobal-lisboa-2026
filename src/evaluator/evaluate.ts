/**
 * M6 · `evaluate` — the sealed judgement. See `docs/spec-02-evaluator.md`.
 *
 * Orchestration only: build the prompt, call the sealed model through a port,
 * and refuse anything that is not one of four words. The port keeps 0G out of the
 * logic so all of the below is unit-testable without spending 0G or needing a
 * network — the real adapter is `og-client.ts`.
 *
 * FAIL CLOSED, like M7. Every failure mode returns a typed result rather than a
 * verdict, because the caller's next move is to publish, and a publish path with
 * an ambiguous input is how a wrong verdict gets signed.
 */
import { type UseCaseId, useCaseIdSchema } from "../session/usecases";

import { responseFormat, systemPrompt, userPrompt } from "./prompt";
import { applyConsent, isGapVerdict, verdictSchema, type GapConsent, type Verdict } from "./verdict";

/** What the model returned, plus what we need to police it (D-M6-1). */
export interface SealedModelResponse {
  /** The completion text. Should be JSON matching `responseFormat`, or a bare enum. */
  content: string;
  /**
   * Chain-of-thought, if the provider sent any. MUST be empty.
   *
   * This is not a formatting nit. A reasoning trace discusses both positions in
   * detail, so receiving it hands the operator exactly what
   * `security-and-privacy.md` §a promises they cannot have. Not publishing it is
   * not enough — receiving it is already the breach (D-M6-1). Confirmed live on
   * 25 Jul: the pinned model returned 724 characters of it beside a one-word
   * answer when thinking was left at its default.
   */
  reasoningContent?: string | undefined;
  /** Echoed back so we can assert the pinned model actually served the call. */
  model?: string | undefined;
}

/** The seam between us and 0G. Implemented for real by `og-client.ts`. */
export interface SealedModel {
  complete(request: {
    system: string;
    user: string;
    responseFormat: Record<string, unknown>;
  }): Promise<SealedModelResponse>;
}

export interface EvaluateInput {
  /**
   * Side A's position in plain language.
   *
   * ⚠️ OPEN BOUNDARY (D-M6-2). The spec says decryption happens inside the
   * enclave, and that is where it belongs — but the 0G router is a chat API, so we
   * cannot hand it a private key and have it run our ECIES decryption. Whether a
   * separate enclave ENCRYPTION key exists is still unanswered
   * (`OG_ENCLAVE_SEAL_PUBKEY` is empty; handoff §3.1).
   *
   * So this function takes PLAINTEXT and the caller owns the boundary: it must
   * ensure the plaintext exists only where it is allowed to. That is an honest
   * seam, not a solved problem — do not let it read as one in the demo.
   */
  positionA: string;
  positionB: string;
  useCase: UseCaseId;
  consent: GapConsent;
}

export type EvaluateFailure =
  /** A position was empty — nothing to judge, and a verdict would be fabricated. */
  | "empty_position"
  | "unknown_use_case"
  /** The model or the network failed. */
  | "model_error"
  /** Output was not in the enum. Belt #1 and belt #2 both failed. */
  | "off_enum_output"
  /** Reasoning came back. A breach, not a formatting problem (D-M6-1). */
  | "reasoning_returned"
  /** The response came from a model we did not pin. */
  | "model_mismatch";

export type EvaluateResult =
  | {
      ok: true;
      verdict: Verdict;
      /** True when a `gap:*` was produced but withheld for lack of consent. */
      gapWithheld: boolean;
      /**
       * The EXACT model id the provider reported — record it with the verdict
       * (RF-M6-005). More specific than what we pin: the catalog advertises
       * `0gm-1.0-35b-a3b` and the provider serves `0GM-1.0-35B-A3B-0427`, so this
       * is the only place the served snapshot is captured.
       */
      model: string | undefined;
    }
  | { ok: false; reason: EvaluateFailure; detail?: string };

function fail(reason: EvaluateFailure, detail?: string): EvaluateResult {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

export interface EvaluateDeps {
  model: SealedModel;
  /** `OG_MODEL`. When set, the served model must match it — see `servesPinnedModel`. */
  pinnedModel?: string | undefined;
}

/**
 * Does the served model satisfy our pin?
 *
 * Prefix match, case-insensitive, and the asymmetry is the point. Found live on
 * 25 Jul: the catalog advertises `0gm-1.0-35b-a3b`, but the provider actually
 * serves **`0GM-1.0-35B-A3B-0427`** — a snapshot suffix nothing in the public API
 * exposes. Exact equality rejects the very model we pinned.
 *
 * So the pin guarantees the FAMILY, and `EvaluateResult.model` records the exact
 * snapshot alongside the verdict (RF-M6-005). That split is deliberate: a newer
 * snapshot of the pinned model is still the pinned model and should not break a
 * demo, while a genuinely different model (`glm-5.2`, or the `-sia` variant) fails
 * the prefix and is refused.
 *
 * What this does NOT claim: that two snapshots behave identically. Reproducibility
 * was never promised (RNF-M6-002) — what is proven is that *this* model, named
 * exactly, saw these inputs and returned this verdict.
 */
export function servesPinnedModel(served: string, pinned: string): boolean {
  return served.trim().toLowerCase().startsWith(pinned.trim().toLowerCase());
}

/**
 * Extract the verdict from a completion.
 *
 * Accepts either the JSON `{"verdict": "..."}` that `response_format` should
 * produce, or a bare token — providers vary, and a correct answer in the wrong
 * wrapper should not read as an off-enum failure. Anything else is rejected.
 *
 * Deliberately does NOT search for an enum value inside a longer string: if the
 * model wrote a paragraph containing the word "workable", that is a compliance
 * failure and must surface as one. Recovering a verdict from prose would mean the
 * enum guarantee (D9) holds in the type system but not in reality.
 */
export function parseVerdict(content: string): Verdict | null {
  const trimmed = content.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { verdict?: unknown };
      const result = verdictSchema.safeParse(parsed.verdict);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  const result = verdictSchema.safeParse(trimmed);
  return result.success ? result.data : null;
}

export async function evaluate(input: EvaluateInput, deps: EvaluateDeps): Promise<EvaluateResult> {
  // An empty position cannot be judged. Asking anyway invites the model to invent
  // one side of the negotiation and answer about it.
  if (input.positionA.trim().length === 0 || input.positionB.trim().length === 0) {
    return fail("empty_position");
  }
  if (!useCaseIdSchema.safeParse(input.useCase).success) {
    return fail("unknown_use_case", String(input.useCase));
  }

  let response: SealedModelResponse;
  try {
    response = await deps.model.complete({
      system: systemPrompt(input),
      user: userPrompt(input),
      responseFormat: responseFormat(input.consent),
    });
  } catch (error) {
    return fail("model_error", error instanceof Error ? error.message : String(error));
  }

  // Checked BEFORE the verdict is read. A correct verdict alongside a reasoning
  // trace is still a breach, and treating it as a success would mean the check
  // only ever fires when something else already went wrong.
  if (response.reasoningContent !== undefined && response.reasoningContent.trim().length > 0) {
    return fail(
      "reasoning_returned",
      `${response.reasoningContent.length} chars of reasoning — thinking is not disabled`,
    );
  }

  if (deps.pinnedModel && response.model && !servesPinnedModel(response.model, deps.pinnedModel)) {
    return fail("model_mismatch", `served by ${response.model}, pinned ${deps.pinnedModel}`);
  }

  const raw = parseVerdict(response.content);
  if (raw === null) {
    // The detail is capped: on a compliance failure the content is model prose
    // about both positions, which is the one thing we must not spread into logs.
    return fail("off_enum_output", `${response.content.trim().slice(0, 40)}…`);
  }

  const verdict = applyConsent(raw, input.consent);
  return {
    ok: true,
    verdict,
    gapWithheld: isGapVerdict(raw) && verdict !== raw,
    model: response.model,
  };
}
