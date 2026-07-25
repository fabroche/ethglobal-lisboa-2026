# spec-02 · evaluator

Status: 🟧 draft · backlog **S2.1 / S2.2** · sponsor **0G**.

> Spec committed **before** the code (spec-driven-workflow rule). Implemented by module **M6 · evaluator**.

## Goal
Inside the 0G TeeML enclave, decrypt both sealed positions (the first and only place plaintext exists),
run a **pinned model at temperature 0**, and emit a **single enum verdict** — never free text (D9).

## Inputs / outputs
| | Shape |
|---|---|
| **Input** | `{ ciphertextA, ciphertextB, useCase: "property" \| "job" \| "otc", gapOptIn: { a: boolean, b: boolean } }` |
| **Output** | `{ verdict: "workable" \| "not_workable" \| "gap:single" \| "gap:multiple" }` |

The enclave emits the **richest verdict both sides consented to**: a `gap:*` value is allowed **only if
`gapOptIn.a && gapOptIn.b`**; otherwise the output is the bare `workable` / `not_workable`.
The two consent booleans are read from the topic: each side declares `gapOptIn` on its **commitment
message** at seal time (see `00-overview/02-data-model.md` §2); a commitment without the field counts
as `false` (fail-safe).

**Gap semantics (D9 as amended).** The gap values reveal **how many** dimensions block, never
**which**. The counting basis is the three internal dimensions — compensation, timing, scope —
assessed inside the enclave: emit `gap:single` iff exactly one dimension blocks and the model can
attribute the failure to it cleanly; emit `gap:multiple` when several block **or** the positions are
too entangled (tradeoffs across dimensions) to attribute to one. The dimension names never leave the
enclave — "the single blocking dimension" as an output was rejected because it is ill-defined in
those two cases, and a forced pick would fabricate an answer.

## Function signature (sketch)
```ts
// runs inside the enclave via the 0G router (OpenAI-compatible)
async function evaluate(input: EvaluatorInput): Promise<Verdict> {
  const a = decrypt(input.ciphertextA); // plaintext exists only here, in enclave memory
  const b = decrypt(input.ciphertextB);
  const raw = await router.chat({ model: OG_MODEL, temperature: 0, /* constrained enum schema */ });
  return VerdictSchema.parse(raw); // Zod — reject anything not in the enum
}
```
- `OG_MODEL` is pinned to an exact model and its hash is recorded (see `transversal/integration-0g.md`).
- Output is **constrained** to the enum (structured output / grammar) and re-validated with Zod (D11).
- The prompt **prepends `usecases[useCase].evaluatorHint`** (D16, from `src/session/usecases.ts` —
  shared with M1/M8), e.g. *"This is a property negotiation — judge workability on price, CPCV amount,
  CPCV date, CPCV→deed timing."* The hint names dimensions, never terms; positions remain free-form
  and the output enum is unchanged (D9).

## Acceptance criteria
- [ ] Output is **always** one of the enum values; free text is impossible/rejected.
- [ ] `gap:*` appears **only** when both sides opted in; otherwise the bare verdict.
- [ ] Plaintext exists **only** in enclave memory — never returned, logged, or persisted.
- [ ] The call uses the pinned model hash and `temperature: 0`.

## Non-goals
- No attestation verification here — that is **spec-03** (the verdict is not published until it passes).
- No persistence — writing the verdict to the topic is `registry` (M4).
- Note precisely: temp 0 + a pinned hash is not a guarantee of run-to-run reproducibility; what is proven
  is *this model saw these committed inputs and returned this verdict* (see spec-03).
