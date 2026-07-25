# spec-02 · evaluator

Status: 🟩 **implemented (S2.2, 25 Jul)** · backlog **S2.1 / S2.2** · sponsor **0G**.

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

## ⚠️ Reasoning tokens must be OFF (D-M6-1)

The pinned model `0gm-1.0-35b-a3b` is described by 0G as *"thinking enabled by default"*, and its
`default_parameters` are `{ temperature: 1, top_k: 20, top_p: 0.95 }` — **both defaults are wrong for us,
and one of them is a privacy hole.**

A reasoning model emits a chain of thought, and that chain **discusses both positions in detail**. If it
comes back in the response, our server receives prose derived from both sides' terms — the operator can
then learn what the threat model (`security-and-privacy.md` §a) promises they cannot. It does not matter
that we never publish it; receiving it is already the breach. This is the enum rule (D9) defeated through
a side channel rather than through the verdict field.

Requirements, all Must:

- **Disable thinking explicitly** via `reasoning_effort` and/or `chat_template_kwargs` (both are in the
  model's `supported_parameters`). Never rely on a default.
- **Assert the response carries no reasoning.** If `reasoning_content` — or any field other than the
  enum — comes back non-empty, that is a **failure, not a verdict**: discard it and publish nothing
  (same fail-closed posture as M7).
- **Set `temperature: 0` explicitly.** The provider default is 1.
- Use `response_format` (in `supported_parameters`, so the router supports constrained output) as the
  first belt, Zod as the second (D11).

## Acceptance criteria — met 25 Jul (S2.2)
- [x] Output is **always** one of the enum values; free text is impossible/rejected.
- [x] `gap:*` appears **only** when both sides opted in; otherwise the bare verdict.
- [~] Plaintext exists **only** in enclave memory — **see D-M6-2 below.** The module never returns,
      logs or persists a position, and off-enum failure details are truncated precisely because model
      prose is derived from both positions. But the decryption boundary itself is **unresolved**.
- [x] The call uses the pinned model and `temperature: 0` **explicitly** (provider default is 1).
- [x] **No reasoning/thinking content is returned**; if any is, nothing is published (D-M6-1).
- [x] A test asserts the response body contains no field carrying free text.

Verified live with `npm run eval:live`: bare verdicts correct with no consent, and with two-sided
consent the model returned `gap:multiple` when price *and* timing blocked and `gap:single` when only
timing did — the counting semantics work in practice, not only on paper.

## ⚠️ D-M6-2 · the decryption boundary is an open seam

The spec above says the enclave decrypts. It should — but **it cannot, as things stand**, and the demo
must not imply otherwise.

The 0G router is a chat-completions API. There is no way to hand it a private key and have it run our
ECIES decryption, and whether the enclave even exposes a separate **encryption** key is still
unanswered — `OG_ENCLAVE_SEAL_PUBKEY` is empty (handoff §3.1). `teeSignerAddress` is a 20-byte address
and you cannot encrypt to an address (spec-04 §2).

**Decision.** `evaluate()` takes **plaintext** positions and the caller owns the boundary. The seam is
explicit in the type documentation rather than hidden behind a `decrypt()` call that does not exist.

**What is still true, and is what we should say:** positions are sealed in the browser, our store holds
only ciphertext and hashes (demonstrable — `npm run inspect`), and the enclave's judgement is
independently verifiable (`npm run spike`). **What is not yet true:** that plaintext exists *only*
inside the TEE. Claiming that would be the kind of overstatement spec-03 §5 warns about.

## Non-goals
- No attestation verification here — that is **spec-03** (the verdict is not published until it passes).
- No persistence — writing the verdict to the topic is `registry` (M4).
- Note precisely: temp 0 + a pinned hash is not a guarantee of run-to-run reproducibility; what is proven
  is *this model saw these committed inputs and returned this verdict* (see spec-03).
