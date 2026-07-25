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

## 1. 0G · ✅ RESOLVED — `npm run spike` is FULL GO

> **Updated Sat 25 Jul ~15:45.** **The gamble is won.** A real enclave signature verifies against our
> pinned key, `npm run spike` exits 0, and spec-03 §8.1 resolved in our favour. This section is kept
> as the record of how, because most of it was expensive to find. Nothing here is blocked.

```
PASS  REAL 0G signature verifies against the pinned key (scheme=secp256k1-eth, signer=0x0038f716…)
PASS  one flipped character in the REAL payload is rejected (signer_mismatch)
PASS  signed text's second half is sha256(response)
FULL GO — a real 0G response verifies against a pinned key.
```

### The three things that had to be understood

**1. The Router can never produce a signature.** `router-api.0g.ai` pays the broker with its OWN
wallet, so the broker's customer is the Router, not us. Asking it for our chatID was asking for the
receipt of a conversation we were never party to — `chat_id_not_found` was correct behaviour, not a
bug. **The only path that yields a signature is direct to the broker, paying on-chain.** 0G's own skill
package (`github.com/0gfoundation/0g-compute-skills`) documents exactly this flow and never mentions
`router-api` at all.

**2. `OG_ENCLAVE_PUBKEY` must be `teeSignerAddress`, not the provider address.** See §4 — the live
signature's `signing_address` confirms it.

**3. 0G signs a RAW STRING, so canonical serialisation breaks it.** The signed value is
`sha256(input):sha256(response)`. Canonicalising it (spec-03 §3) wraps it in JSON quotes, the bytes
stop matching, and it fails as **`signer_mismatch`** — which reads exactly like a wrongly pinned key
and is not one. Hence `encoding: "canonical" | "utf8"` on the envelope, and a test that asserts the
real signature FAILS under canonical so the trap stays caught.

### Setup, one time only (already done)

```powershell
npm run og:status                # read-only: derives the address, checks wallet + ledger
npm run og:setup                 # dry run — prints the plan, sends nothing
npm run og:setup -- --confirm    # spends: addLedger(3) + acknowledgeProviderSigner
```

**The ledger minimum is 3 0G**, and it is an *account-opening floor*, unrelated to usage — a sealed
call costs ~0.0005 0G. Budgeting from the call price gets you a wallet that cannot transact. Refunds
carry a 24-hour lock, so deposit the floor and top up rather than parking funds.

### Coordinates

| What | Value |
|---|---|
| Broker URL | `https://compute-network-20.integratenetwork.work` (on-chain `getService().url`) |
| Signature | `GET {broker}/v1/proxy/signature/{chatID}?model={model}` → `{ text, signature, signing_address, signing_algo }` |
| Scheme | EIP-191 / `personal_sign` = our `secp256k1-eth` |
| Inference contract | `0x47340d900bdFec2BD393c626E12ea0656F938d84` |
| Ledger contract | `0x2dE54c845Cd948B72D2e32e39586fe89607074E3` |
| RPC / chain id | `https://evmrpc.0g.ai` / `16661` |

⚠️ `getServiceMetadata()` returns an endpoint **already ending in `/v1/proxy`**. The signature path is
built from the BASE url — append to the endpoint and you get `/v1/proxy/v1/proxy/…` and an
`"unsupported endpoint"` error that looks like a wrong route.

### Historical record — what the failure looked like before

**`npm run spike` PART A passes. PART B fails on one check: `response carries a signature`.**

The chat response is fine, but **the signature is not in it.** The body carries
`choices / created / id / metadata / model / object / usage / x_0g_trace`, and the only hex-shaped
field is the provider address. The signature is fetched **separately, by chatID**.

### What the signature path actually is (read out of the SDK, not guessed)

From `@0gfoundation/0g-compute-ts-sdk@0.9.0`, `lib.commonjs/inference/broker/{response,verifier}.js`:

```
GET {brokerURL}/v1/proxy/signature/{chatID}?model={model}   ->   { text, signature }
verify: ethers.hashMessage(text) + recoverAddress == signingAddress
```

Two things fall out of that, both good for us:

- **The scheme is EIP-191 `personal_sign`** — `ethers.hashMessage` *is* the `\x19Ethereum Signed
  Message:\n` framing. That is exactly our `secp256k1-eth`, already our `DEFAULT_SCHEME`. Our guess
  in spec-03 §4 was right; `eip191Digest()` in `src/evaluator/attest.ts` needs no change.
- **The signed thing is `text`**, a field the broker returns. What `text` *contains* is what settles
  booth question §3.2 (does the signature cover the input?) — read it the moment we can fetch one.

### Coordinates, all resolved (nothing here needs the booth)

| What | Value | Where it came from |
|---|---|---|
| Broker URL | `https://compute-network-20.integratenetwork.work` | on-chain `getService(provider).url` |
| Inference contract (mainnet) | `0x47340d900bdFec2BD393c626E12ea0656F938d84` | SDK `constants.js` |
| 0G mainnet RPC / chain id | `https://evmrpc.0g.ai` / `16661` | SDK `constants.js` |
| Architecture | `TargetSeparated: false` → combined TEE, **one** report, signer = `teeSignerAddress` | on-chain `additionalInfo` |
| TEE verifier | `dstack` (Intel TDX), `verifier-v0.5.5` | on-chain `additionalInfo` |

### ⛔ Where it is stuck now

**The broker does not recognise any chatID produced by a call through `router-api.0g.ai`.** All three
candidate identifiers return `HTTP 400 {"error":"...Chat id not found or expired, chat_id_not_found"}`:

- `zg-res-key` response header (e.g. `4d3349ea-…`)
- `body.id` (`chatcmpl-…`)
- `body.x_0g_trace.request_id`

Note the endpoint itself is **correct** — a wrong path returns `404 page not found`, and this returns
a *business* error. So the route is right and the ID is wrong.

**Leading hypothesis:** the Router is an intermediary that opens its own session with the broker under
its own chatID. Only calls made **directly to the broker** produce a chatID the broker can sign for.
Going direct means the SDK's on-chain payment flow (0G wallet + `ledger` contract + per-request signed
headers + auto-funding) — a much heavier path than a Bearer key against the router.

**Decide next** (this is a real fork, see §7):
1. Ask the booth: *how do we get the response signature for a call made through the Router?* This is
   now the single highest-value question we have — it is one sentence and it unblocks the core claim.
2. If the answer is "you can't, go direct to the broker" → weigh the direct-broker path against
   rewording the claim. Do not start the direct-broker work before the window is checked (§5).

### Also confirmed live: D-M6-1 is real, not theoretical

A plain call with `max_tokens: 10` came back with `content: null` and `reasoning_content` **populated**
("Here's a thinking process: …"). With `max_tokens: 400` the answer was correct but still carried
**724 characters of reasoning**. The model really does return its chain of thought by default, and it
really would hand the operator prose derived from both positions. `spec-02-evaluator.md` §D-M6-1 must
be implemented in S2.2 — treat it as confirmed, not suspected.

## 2. Waiting on a human

| What | Who | Why it matters |
|---|---|---|
| ~~Merge PR #9~~ | ~~integrator~~ | ✅ **Done.** Merged 00:03, and Dylan's S2.7 (#10) merged 00:32 on top of it. |
| ~~Check the 0G balance~~ | ~~Dylan~~ | ✅ **Moot.** The hang is gone; the chat call returns 200 (§1). |
| ~~Booth Q: signature for a Router call~~ | — | ✅ Answered: you can't. Go direct to the broker (§1). |
| Booth Q: enclave encryption key | either | §3.1 — still open, still blocks sealing to the *real* enclave. |
| **⛔ Land `c879e20` + wire per-side consent (S2.8, P0)** | **dylan** | **Blocks the next merge to `develop`.** See below. |

### 📌 Two things about running the app that will waste your time otherwise

**1. `allowedDevOrigins` in `next.config.ts` contains a hardcoded LAN IP.**

The dev server binds `0.0.0.0` so a phone can scan the join QR. Reaching it by LAN
address made Turbopack's HMR WebSocket fail its handshake, and **that stops the page
hydrating at all** — with a symptom that looks nothing like a socket problem:
buttons do nothing, and the create form falls back to a native GET submit
(`/create?deadline=…`) because there is no `onSubmit` to intercept it.

`allowedDevOrigins: ["10.1.1.167", ...]` fixes it, and **that IP changes when you
change network.** At the venue, put your own address there or dev-over-LAN breaks
again in exactly this confusing way. `npm run start` (production) is unaffected —
verified.

**2. There is a known hydration error (React #418) whenever the theme is dark.**

Reproducible with nothing but the OS set to dark mode: `next-themes` sets the class
on `<html>` from an inline script that runs before React hydrates, and React objects
even with `suppressHydrationWarning` on that element. React recovers (it regenerates
the tree) and everything works — toggle, room creation, navigation all verified in a
real browser.

**It predates the navbar.** Confirmed by reproducing it with no `localStorage` and no
toggle interaction, purely from the system preference — so it has been there since
`ThemeProvider` was scaffolded with `enableSystem`. Not fixed: it is cosmetic, it is
third-party behaviour, and the remaining time is better spent elsewhere. Worth
knowing before someone opens the console during the demo and thinks it is new.

### ⛔ S3.7 · the position field leaks to the browser — blocking S3.2's merge, P0

**dylan — this is in a file you have open right now (`seal-position-form.tsx`, still on
`develop-dylan`), which is why it is being handed over rather than patched in parallel.**

The `<textarea name="position">` sets no `autoComplete`, `spellCheck`, `autoCorrect` or
`autoCapitalize`, and neither does the `<form>`. Two consequences:

- **The browser may write the position to disk.** Form history is keyed by field name, so
  `name="position"` is exactly what gets remembered — and later offered as a suggestion, including to
  the next person using that machine.
- **The text may be sent to a third party.** Chrome's *Enhanced spell check* and Edge's *Microsoft
  Editor* transmit what you type to Google/Microsoft. Opt-in, often on without the user realising.

Three lines above that field, the UI promises: *"sealed **in this browser** to the enclave key — the
other side and the operator never see it."* True of our code, not true of the whole system while this
stands. It is the same class of hole as **D-M6-1** — where we decided that *receiving* the model's
reasoning is already the breach — except earlier in the chain, and about the user's own words.

```tsx
<textarea
  autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="off"
  data-1p-ignore data-lpignore="true"
  // and drop or rename name="position"
/>
```
Plus `autoComplete="off"` on the `<form>`.

**A trade-off to decide rather than skip:** `spellCheck={false}` removes the red underline on a field
where people are writing terms that matter. Recommendation is to take it and *say so* in the UI —
*"spellcheck is off on purpose: your text never leaves this browser"* — which turns a limitation into
evidence that the promise is real. Your call, but please make it explicitly.

**Meanwhile frank is on S3.8** (post-create navigation + showing both join links). That touches
`create/actions.ts`, `create-room-form.tsx` and `room/[roomId]/share`, **not** `seal-position-form.tsx`
— so the two should not collide.

### ⛔ S2.8 · per-side gap consent — blocking, P0

**Right now one person consents on behalf of both.** `gapOptIn` is a single room-level boolean set by
whoever creates the room (`src/session/room.ts:22`, a checkbox on the create form), so **side B never
agrees to anything.** The two-sided consent guarantee — *"if one side wants the bare answer, everyone
gets the bare answer"* — is currently aspirational.

`c879e20` on `develop-dylan` does the schema half and does it well: `gapOptIn` per side on the
commitment message, required in the builder so the S3.2 writer must pass an explicit choice, and
schema-defaulted `false` at parse so legacy commitments read as no-consent (missing consent fails safe
to the bare verdict, never to disclosure).

**What is still missing is the wiring:** read BOTH commitments off the topic and pass
`consent: { a: commitmentA.gapOptIn, b: commitmentB.gapOptIn }` into `evaluate()`. The evaluator has
enforced the rule since S2.2 — twice, in fact (the prompt withholds the `gap:*` vocabulary, and
`applyConsent` degrades on the way out) — but it can only enforce what it is handed. Consent must come
from the two commitments, **never** from the create form, which is only A's prefill.

Why it is P0 rather than a nice-to-have: a judge asking *"where does the other party agree to this?"* is
a question we should want. Today the honest answer is that they don't.

## 3. Still unanswered by 0G

Only one left, and it is no longer on the critical path.

1. **Is there a separate *encryption* key for the enclave?** `seal` needs one and
   `OG_ENCLAVE_SEAL_PUBKEY` is empty. The attestation value is a 20-byte address and **you cannot
   encrypt to an address**. Without this, S3.2 can seal to a test key but not to the real enclave.
2. ~~**Does the response signature cover the request input?**~~ ✅ **YES — settled empirically, 25 Jul.**
   Two calls with different prompts produce different first halves of the signed text; the second half
   is exactly `sha256(raw response)`. So *"this model saw THESE inputs and returned this verdict"* is
   supported and **the pitch needs no rewording**. We cannot recompute the input half ourselves (the
   broker normalises the request before hashing) — say "derived from the request", not "sha256 of our
   bytes". The fallback of hashing inputs into the prompt is no longer needed.
3. ~~**How do we get the response signature for a call made through the Router?**~~ ✅ **You don't.**
   Structurally impossible — the Router is the broker's customer, not us. Go direct. See §1.

## 4. Facts that were expensive to find — don't rediscover them

- **`GET /v1/models` and `GET /v1/providers` need no auth.** They answered more questions than the
  docs did. Use them before guessing.
- **0G testnet is unusable for us.** Two models: `qwen-image-edit` is TeeML but edits images;
  `qwen2.5-omni` is a chatbot but only TeeTLS. Enclave *or* chat, never both. Hence mainnet (DA8).
- **`OG_ENCLAVE_PUBKEY = 0x0038f716958a90b753da6937787395e2365db2e8`** ✅ **verified on-chain, 25 Jul.**
  This is `teeSignerAddress` — **who signs**. It is **not** the provider address
  `0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9`, which is only **who gets paid**, and which is what we
  had pinned until now. Both are fields of the same `Service` struct, one index apart in the docs and
  a world apart in meaning. The old value would have failed *every* verification with
  `signer_mismatch`; fail-closed means we would have published **no verdict at all** in the demo, and
  nothing would have shown it until the first real signature arrived.

  `response.js` in the SDK verifies against `svc.teeSignerAddress` (and against
  `additionalInfo.TargetTeeAddress` instead, but only when `TargetSeparated` is true — ours is false).

  **Verify it yourself** — on-chain, no router, no SDK, no us in the path:
  ```bash
  curl -s -X POST https://evmrpc.0g.ai -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x47340d900bdFec2BD393c626E12ea0656F938d84","data":"0x15a523020000000000000000000000004870cbc4d07d6ac2ee5aa865588e5985fe77a4e9"},"latest"]}' \
    | tr -d '\n' | sed 's/.*"result":"0x//;s/".*//' | fold -w64 | sed -n '11p;12p'
  ```
  word 11 = `teeSignerAddress`, word 12 = `teeSignerAcknowledged` (must be `1`, and it is).
  `0x15a52302` is `keccak256("getService(address)")[0:4]`.

  **This is a moving value.** `teeSignerAddress` changes if the enclave is redeployed. Re-run the curl
  before the demo; if it moved, `.env.local` must move with it.
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
