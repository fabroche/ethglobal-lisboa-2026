# 0G booth — what to ask, and what to do with each answer

> Open this on your phone in the queue. Written 25 Jul ~13:10, after the Router/broker split was
> traced. Background in `handoff-open-threads.md` §1.

## The ask, in one sentence

> **"If I make the call through the Router API, how do I get the TEE signature for that response?"**

Follow-up if they say you can't:

> **"So the only way to get the signature is to go directly to the provider's broker?"**

Everything below is for when they ask for detail. Lead with the sentence, not the detail.

---

## What we already did, so you can say it fast

We are **not** asking how attestation works. We have read the SDK and we have the route. We are stuck
on one specific thing: the chatID.

- Calls go to `https://router-api.0g.ai/v1/chat/completions` with a Bearer key. They work — HTTP 200.
- Model `0gm-1.0-35b-a3b`, single provider `0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9`,
  `verifiability: TeeML`, `tee_type: TDX`, `trust_mode: private`, `tee_acknowledged: true`.
- The chat response carries **no signature**. Body keys: `choices, created, id, metadata, model,
  object, usage, x_0g_trace`. The only hex field is the provider address.
- From `@0gfoundation/0g-compute-ts-sdk@0.9.0`, `inference/broker/{response,verifier}.js`, the
  signature is fetched separately:

  ```
  GET {svc.url}/v1/proxy/signature/{chatID}?model={model}  ->  { text, signature }
  verify: ethers.hashMessage(text) + recoverAddress == svc.teeSignerAddress
  ```

- We read `svc` on-chain ourselves — `getService(address)` on the mainnet InferenceServing contract
  `0x47340d900bdFec2BD393c626E12ea0656F938d84` via `https://evmrpc.0g.ai`:

  | Field | Value |
  |---|---|
  | `url` | `https://compute-network-20.integratenetwork.work` |
  | `teeSignerAddress` | `0x0038f716958a90b753da6937787395e2365db2e8` |
  | `teeSignerAcknowledged` | `true` |
  | `additionalInfo` | `TargetSeparated: false`, `TEEVerifier: dstack`, `verifier-v0.5.5` |

## The exact failure

Every chatID we can see from a Router call is rejected by that broker:

```
GET https://compute-network-20.integratenetwork.work/v1/proxy/signature/{id}?model=0gm-1.0-35b-a3b
-> HTTP 400 {"error":"prepare HTTP request: Chat id not found or expired, chat_id_not_found"}
```

Tried all three identifiers a Router response exposes:

| Source | Example |
|---|---|
| `ZG-Res-Key` response header | `bfae6e4d-6c91-47fc-8819-7eab4ecc9531` |
| `body.id` | `chatcmpl-02ca5d4f-dbd8-4c7f-bd09-8b3b2287654b` |
| `body.x_0g_trace.request_id` | `4c115024-9fda-435c-9315-b81bdba88762` |

**The route is right.** A wrong path on that host returns `404 page not found`; this returns a
business error, so the handler exists and is reachable without auth.

**Our hypothesis, worth stating out loud** — it invites a one-word correction if we're wrong: the
Router proxies to the broker under its *own* session, so the chatID we receive is the Router's
internal id, not one the broker can look up. Only a direct-to-broker call would produce a chatID the
broker recognises.

`npm run spike` prints all of the above, including the failing request. Show them the output.

---

## Reading their answer

| If they say | It means | Do this |
|---|---|---|
| "There's a Router endpoint for it" | Best case. | Get the exact path. Wire it into `fetchBrokerSignature()` in `scripts/spike-attest.ts` — the verify path already exists and needs no change. |
| "Pass header/param X so the chatID is preserved" | Also cheap. | Get the exact name. Same one-line change. |
| "You must call the broker directly" | Expensive: wallet + `ledger` contract + per-request signed headers. | **Do not start it at the booth.** Bring the answer back and decide against the clock (feature freeze 22:00). |
| "Use a different id field" | We may have missed one. | Get the field name; retry on the spot if you have a laptop. |
| "Signatures aren't exposed for Router calls" | The core claim can't be demonstrated live. | Ask immediately: *"is there any way to get an independently verifiable signature from this model today?"* Then we reword the pitch — see below. |

## Second question, if there's time

> **"Is there a separate encryption key for the enclave — one I can encrypt a payload to, so only the
> enclave can read it?"**

Why it matters: `seal` (M2) hybrid-encrypts each side's position to the enclave. `teeSignerAddress` is
a 20-byte **address** and you cannot encrypt to an address. Without a real encryption key, S3.2 can
only seal to a test key, and "plaintext exists only inside the enclave" is a design claim rather than
a demonstrated one. Env var `OG_ENCLAVE_SEAL_PUBKEY` is waiting for this. (See `spec-04-seal.md` §2.)

## Third question, only if they're not busy

> **"When you sign a response, does the signed message include the prompt, or only the completion?"**

Our pitch is "this model saw *these* inputs and returned this verdict". If only the output is signed,
that sentence is unsupported and must be **reworded before the demo, not during the Q&A**. We can
answer this ourselves the moment one signature fetch succeeds — the spike prints the signed `text` and
checks whether the prompt is inside it — so don't spend booth time on it if the queue is long.

---

## Do not overstate what we built

If it comes up, the honest line — and it is still the strongest claim in the room:

> "We verify the enclave's response signature independently of your SDK, using general-purpose crypto
> only, against a signer address we pinned from the chain."

**Not** "we verify the TEE attestation end to end from the Intel root." We do **not** parse the TDX
quote or walk its certificate chain. Someone in that room will know the difference, and claiming it is
how this demo loses. See `spec-03-attest.md` §5.
