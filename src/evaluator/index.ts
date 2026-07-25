/**
 * M6 · `evaluator` + M7 · `attest` — public surface.
 * See `docs/spec-02-evaluator.md` and `docs/spec-03-attest.md`.
 *
 * Two responsibilities that must stay separable: M6 produces a verdict, M7
 * decides whether one may be published. The publish path is
 * `evaluate() -> verifyEnvelope() -> mayPublish()`, and skipping the middle step
 * is the failure this module's shape exists to make awkward.
 *
 * `og-client` is NOT re-exported: it is `server-only` and importing it from a
 * client component should fail loudly at its own door rather than here.
 */
export {
  evaluate,
  parseVerdict,
  type EvaluateDeps,
  type EvaluateFailure,
  type EvaluateInput,
  type EvaluateResult,
  type SealedModel,
  type SealedModelResponse,
} from "./evaluate";

export {
  VERDICTS,
  GAP_VERDICTS,
  applyConsent,
  bothConsented,
  isGapVerdict,
  verdictSchema,
  type GapConsent,
  type GapVerdict,
  type Verdict,
} from "./verdict";

export { allowedVerdicts, responseFormat, systemPrompt, userPrompt, type PromptInput } from "./prompt";

export {
  DEFAULT_SCHEME,
  SIGNATURE_SCHEMES,
  PAYLOAD_ENCODINGS,
  addressFromPublicKey,
  digestFor,
  eip191Digest,
  envelopeSchema,
  mayPublish,
  verifyEnvelope,
  type AttestFailure,
  type AttestResult,
  type Envelope,
  type PayloadEncoding,
  type SignatureScheme,
} from "./attest";
