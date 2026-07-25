# `evaluator` — sealed evaluation (M6) + attestation (M7)

Backlog **S2.2 / S2.3 / S0.3** · lean owner: `frank` (0G)
Specs: `docs/spec-02-evaluator.md`, `docs/spec-03-attest.md` · modules: `docs/modules/M6-evaluator.md`, `M7-attest.md`

Two responsibilities that must stay separable: **M6 produces** a verdict, **M7 decides whether one may
be published**. The publish path is `evaluate() → verifyEnvelope() → mayPublish()`, and skipping the
middle step is the mistake this layout exists to make awkward.

## Files

**M6 · evaluation**
- `verdict.ts` — the **closed output vocabulary** and the consent gate. The leak control (D9) lives
  here, so there is one place to audit when someone asks what this thing can reveal. Answer: one of
  four values, never a character of free text.
- `prompt.ts` — the only text that crosses into the enclave. Its shape is the ceiling on what can come
  back out. The `gap:*` vocabulary is **not offered at all** without two-sided consent.
- `evaluate.ts` — orchestration behind the `SealedModel` port, so all of the logic is unit-testable
  without 0G, a network, or spend. **Fails closed:** every failure returns a typed result, never a
  verdict, because the caller's next move is to publish.
- `og-request.ts` — the request body. Deliberately free of `server-only` so the **privacy switches are
  unit-testable**: if "is thinking disabled?" were only covered by a live script, it would be checked
  when someone remembers, and D-M6-1 is not that kind of requirement.
- `og-client.ts` — the 0G adapter, and the only file here that talks to 0G. `server-only`.

**M7 · attestation**
- `attest.ts` — `verifyEnvelope`, independent of any vendor SDK (`@noble/*` only). **Fail closed:** a
  bad or absent signature ⇒ no verdict published.
- `attest-testkit.ts` — ephemeral-key signing for the spike and tests. **Not a production path** —
  Seam never signs anything; the enclave does.

## Three things worth knowing before you edit this

**The payload encoding is load-bearing.** 0G signs `sha256(input):sha256(response)` as a **raw string**.
Canonicalising it (spec-03 §3) wraps it in JSON quotes, the bytes stop matching, and it fails as
`signer_mismatch` — which looks exactly like a wrongly pinned key and is not one. Hence
`encoding: "canonical" | "utf8"`.

**The served model is not the advertised model.** The catalog says `0gm-1.0-35b-a3b`; the provider
serves `0GM-1.0-35B-A3B-0427`. `servesPinnedModel` matches on prefix; the exact snapshot is recorded
with the verdict (RF-M6-005).

**`evaluate()` takes PLAINTEXT (D-M6-2).** The spec says the enclave decrypts, and it should — but the
router is a chat API and `OG_ENCLAVE_SEAL_PUBKEY` is still unanswered. The caller owns that boundary.
This is an honest seam, not a solved problem: *"plaintext exists only inside the TEE"* is **not yet a
true claim**, so do not make it in the demo.

## Verifying

```powershell
npm run test        # 56 unit tests here, against a fake model
npm run spike       # M7 end to end against the live enclave — FULL GO, exit 0
npm run eval:live   # M6 against the live enclave — GO
```
