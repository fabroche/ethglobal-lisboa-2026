# Open threads — pick up here

Last updated: **2026-07-25, ~02:30 WEST** · written by frank (0G workstream) at end of session.

> **Read this first if you are a Claude resuming work.** Then `CLAUDE.md`, then `docs/backlog.md`.
> Everything below is committed and pushed; nothing is only in a chat window.

---

## Time check — be honest about the window

| | |
|---|---|
| Now | Sat 25 Jul, ~02:30 |
| **Feature freeze** | **Sat 25 Jul, 22:00** (~19h) |
| Submission | Sun 26 Jul, 09:00 |

The remaining scope is large for that window. §5 lists what to cut first if it comes to that —
decide that consciously rather than by running out of time.

---

## 1. The one thing blocking 0G · ⛔ START HERE

**`npm run spike` PART A passes. PART B cannot complete: the chat call returns zero bytes.**

What is already proven, so don't re-investigate it:

- The API key is valid — an unknown model is rejected with `403` in **~0.24s**.
- `0gm-1.0-35b-a3b` **is** on the key's allow-list (an unlisted model gets a different 403).
- The model is right: `TeeML`, `TDX`, `provider_count: 1`, `is_healthy: true`.
- All four spike preflight checks are green.
- It is not the network: TCP connects in 0.07s, then silence until timeout. Streaming behaves the same.

So the router authenticates and authorises, then hangs going to the provider.

**Diagnose in this order** (the spike prints these on timeout too):

1. **Check the balance at [pc.0g.ai](https://pc.0g.ai), top right.** Owning 0G in the wallet is *not*
   the same as depositing it into the Router's payment contract — that deposit is a separate
   transaction. This is the prime suspect and takes 30 seconds to rule in or out.
2. If funded: temporarily allow `0gm-1.0-35b-a3b-sia` on the key and retry. If *that* answers, the
   problem is the provider, not us — switch models and move on.
3. Still stuck: booth. Ask whether a Router API key needs the provider **acknowledged** before first use.

There is no public balance endpoint — `/v1/account`, `/v1/balance`, `/v1/credits` and five other
guesses all 404. It has to be read from the dashboard.

## 2. Waiting on a human

| What | Who | Why it matters |
|---|---|---|
| **Merge PR [#9](https://github.com/fabroche/ethglobal-lisboa-2026/pull/9)** | integrator | **Blocks Dylan's S2.7.** `src/lib/canonical.ts` isn't on `develop`, so the handoff doc reads like nonsense to him. Was `MERGEABLE / CLEAN` at 01:10. **Rebase-and-merge or merge commit — never squash.** |
| Check the 0G balance | Dylan | §1 |
| Two booth questions | either | §3 |

## 3. Still unanswered by 0G

Two left. The other two got answered by querying the API instead of queuing at a booth.

1. **Is there a separate *encryption* key for the enclave?** `seal` needs one and
   `OG_ENCLAVE_SEAL_PUBKEY` is empty. The attestation value is a 20-byte address and **you cannot
   encrypt to an address**. Without this, S3.2 can seal to a test key but not to the real enclave.
2. **Does the response signature cover the request input, or only the output?** Our pitch is "this
   model saw *these* inputs and returned this verdict". If the input isn't covered, that sentence is
   not supported and the wording must change **before** the demo, not during the Q&A. Fallback if
   not covered: hash the sealed inputs into the prompt so it echoes back inside the signed completion.

## 4. Facts that were expensive to find — don't rediscover them

- **`GET /v1/models` and `GET /v1/providers` need no auth.** They answered more questions than the
  docs did. Use them before guessing.
- **0G testnet is unusable for us.** Two models: `qwen-image-edit` is TeeML but edits images;
  `qwen2.5-omni` is a chatbot but only TeeTLS. Enclave *or* chat, never both. Hence mainnet (DA8).
- **`OG_ENCLAVE_PUBKEY = 0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9`** — from `/v1/providers`, the
  sole provider for our model. **Candidate, unverified.** The spike settles it: on a mismatch it
  prints the address it actually recovered, which is then the correct value.
- **The model has thinking ON by default** and `temperature: 1` by default. Both wrong for us, and the
  first is a privacy hole: a chain of thought discusses both positions, so *receiving* it hands the
  operator what `security-and-privacy.md` §a says they cannot have. Not publishing it is not enough.
  Written up as **D-M6-1** in `spec-02-evaluator.md`; must be implemented in S2.2.
- **`response_format` is supported** → router-side constrained enum output is available (D9, belt #1).
- **We picked a deliberately weaker model.** `glm-5.2` is stronger but has 3 providers;
  `0gm-1.0-35b-a3b` has 1, so the signing key cannot rotate. **Expect this in the Q&A** — a stable
  signer beats a smarter model when the product is proving who signed something.

## 5. What's ready to start, in priority order

Nothing below is blocked by §1 except where noted.

1. **S2.2 `evaluator`** — spec is ready and now carries D-M6-1. Can be built and unit-tested with a
   mocked router; only the final wiring needs the live call.
2. **S2.3 `attest` gate** — small. `mayPublish()` exists; it needs wiring into the verdict write path.
   Touches `src/registry` (Dylan's lane) — **coordinate before editing**.
3. **S3.2 `web` write+seal** — the last missing screen. `seal` is done and tested; can use a test
   recipient key until §3.1 is answered.
4. Then: S3.4 E2E · S4.1/S4.2 demo scripts · S4.4 README · S5.1 video.

**If the window gets tight, cut in this order:** S4.6 output vocabulary (`gap:*` opt-in) → S2.6 topic
versioning → S4.3 World testing doc. **Never cut** S4.1/S4.2 (the two demo scripts are what actually
win the room) or the video.

## 6. State of the code

`typecheck` · `lint` · `test` · `build` all green. **146 tests, 20 files**, both workstreams merged
locally on `develop-frank`.

Done this session: **S0.2** (spec-03) · **S0.3** (attest + spike, PART A GO) · **S1.4** (`seal`) ·
shared `src/lib/canonical.ts` · DA6/DA7/DA8 decided · project config pinned to 0G mainnet.
