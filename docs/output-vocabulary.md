# Output vocabulary (S4.6)

The single place that states everything the enclave is allowed to say. The whole privacy
argument rests on this list being short and closed: the enclave reads two plain-language
positions and may emit **only** one value from a fixed set, never free text (D9). A paragraph
would leak ("the gap is the start date" tells the other side something they did not have); an
enum keeps each verdict to almost no information.

Source of truth: `verdictSchema` in `src/session/messages.ts` (Zod enum, re-validated on the way
in and out). Anything off-enum is a failure, not a verdict.

## The five values

| Value | Meaning | When it is allowed |
|-------|---------|--------------------|
| `workable` | A deal looks possible. Worth a real conversation. | Always. |
| `not_workable` | No deal on these terms. Nothing about *by how much*. | Always. |
| `gap:single` | No deal, and **exactly one** dimension blocks it — a deal is one issue away. | Only if **both** sides opted in. |
| `gap:multiple` | No deal, and **several** dimensions block, or they are too entangled to attribute to one. | Only if **both** sides opted in. |

The gap values reveal **how many** dimensions block, never **which** (D9 as amended, DA1). The
three internal dimensions — compensation, timing, scope — exist only inside the enclave as the
counting basis; they never appear in any published message. (Rationale for count-not-dimension:
"the single blocking dimension" is ill-defined when several block at once, and naming one leaks
what the other side would pay to know. See `00-overview/05-open-decisions.md` DA1.)

## Two-sided consent — the gate on the gap values

Each side declares its own consent at seal time, carried on its **commitment message**
(`gapOptIn`, `00-overview/02-data-model.md` §2). The evaluator may emit a `gap:*` value **only
when both commitments carry `true`** (`consentFromCommitments` → `evaluate({ …, consent })`).
Fail-safe in every direction:

- a side with no commitment on the topic has **not** consented;
- a legacy/older commitment without the field reads as `false` (schema default);
- the enforcement is on the way **out** (`applyConsent` downgrades a `gap:*` to `not_workable`
  when consent is missing), not merely requested in the prompt — a prompt is a request, this is a
  privacy boundary.

So without two-sided opt-in, the richest thing the enclave can ever say about a failed deal is
the bare `not_workable`.

## Enforcement (belt and braces)

1. **Constrained generation** at the 0G router (structured/enum output) where the provider
   supports it.
2. **Zod re-validation** of whatever comes back against `verdictSchema` (D11). `parseVerdict`
   deliberately refuses to extract an enum value out of prose — recovering one would make the
   guarantee hold in the types but not in reality.
3. **Consent downgrade** (`applyConsent`) applied after parsing.
4. **Fail closed** (D10): a verdict is published only if the TEE attestation verifies
   independently; no valid attestation ⇒ no verdict at all.

## UI mapping (M8 `verdict-panel`)

`workable` → "a deal is possible" (positive) · `not_workable` → neutral "no deal" (never red —
it is the product working, not an error) · `gap:single` → "no deal, one issue blocks" ·
`gap:multiple` → "no deal, several issues block". The panel never shows a dimension name because
the enclave never emits one.
