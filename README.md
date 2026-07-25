# Overlap

**Sealed two-party negotiation.** Two sides write their terms in plain language into a sealed session.
A model running inside sealed hardware (a TEE) reads both and returns **one word to both** — whether a
deal is `workable` — without either side, or us, ever seeing the other's terms.

> A referee locked in a windowless room. You both slide a paper under the door. The referee says "yes"
> or "no" through the door. Then the papers burn.

**ETHGlobal Lisbon 2026.** No Solidity. No smart contracts. No database.

---

## The problem

Two people want a deal — a flat, a job offer, a block trade. Neither will name their number first,
because whoever speaks first loses ground. So they circle, or use a broker who ends up knowing
everything, or the deal dies before the first call.

The obvious fix is a piece of software that reads both numbers and says "yes" or "no". The obvious
problem with that fix is that **now the software's operator knows both numbers** — and you have moved
the trust, not removed it.

Overlap removes it. The only thing that reads both sides is a model inside a hardware enclave that the
machine's own owner cannot look into, and it may only answer with **one word from a fixed list**.

## How it works

```
Side A opens a room       → deadline published to Hedera BEFORE anyone writes
Both sides write + seal   → ECIES-encrypted in the browser; plaintext never travels
One seat per side         → World Selfie Check, one nullifier per room per side
Commitments locked        → sha256(ciphertext) + timestamp to an HCS topic
Sealed evaluation         → pinned model, temperature 0, inside a 0G TEE
Attestation verified      → FAILS CLOSED: no valid signature ⇒ no verdict, ever
Verdict published         → written to the topic; both sides read it via Mirror Node
```

The verdict vocabulary is closed, and that is a privacy control, not a UI choice. The enclave is the
only thing that has seen both sides, so **anything it emits flows to both**. Free text would leak the
other side's terms.

| Verdict | Meaning |
|---|---|
| `workable` | A deal is possible |
| `not_workable` | It is not |
| `gap:single` | Exactly one dimension blocks — you are one issue away |
| `gap:multiple` | Several block, or they are too entangled to attribute |

`gap:*` requires **both** sides to opt in, and consent is read from the two commitment messages on the
topic — never from the create form, which is only side A's preference. Naming *which* dimension blocks
was designed and then rejected: "the timing blocks" also says "your price was acceptable", and the
other side walks into the next call knowing it.

---

## Verify our claims yourself

The whole product rests on one thing: that a model really ran inside an enclave and signed what it
returned. So don't take our word for it.

```bash
npm run spike        # verifies a REAL enclave signature against our pinned key,
                     #   using @noble/* only — no 0G code in the trust path.
                     #   Then flips one character and shows it rejected.
npm run reveal:live  # the WHOLE loop against real Hedera + real 0G: room → seal →
                     #   commit → enclave → verify → publish → read back.
npm run inspect      # shows our topic holds only hashes — no plaintext, no key.
npm run demo:naive   # the same product built WITHOUT the enclave: the operator
                     #   reads both positions in the clear. `-- --live` shows the
                     #   real enclave returning the identical verdict.
```

**A verdict that already exists on-chain:** room `r_live_ms0v9ctq` on our HCS topic, produced by the
run above. Signature verified, model recorded, readable by anyone through Mirror Node.

**The enclave key, checked without us in the path.** `OG_ENCLAVE_PUBKEY` is
`0x0038f716958a90b753da6937787395e2365db2e8` — the enclave's `teeSignerAddress`. Read it straight off
0G mainnet:

```bash
curl -s -X POST https://evmrpc.0g.ai -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x47340d900bdFec2BD393c626E12ea0656F938d84","data":"0x15a523020000000000000000000000004870cbc4d07d6ac2ee5aa865588e5985fe77a4e9"},"latest"]}' \
  | tr -d '\n' | sed 's/.*"result":"0x//;s/".*//' | fold -w64 | sed -n '11p;12p'
```

---

## What we prove, and what we don't

A demo that overstates its guarantees loses to one question. So, plainly:

**We verify the last link.** We take the enclave's signature and check it against a key we pinned, with
general-purpose crypto we control. We do **not** parse the Intel TDX quote or walk the certificate
chain to an Intel root. That is a real, independently reproducible check — and it is that one, not more.

**The unsealing happens on our server today.** The browser encrypts to a key, but 0G's inference API is
a chat endpoint: there is nowhere to hand it a private key and have it decrypt inside the enclave, and
the only key 0G exposes is a 20-byte signing address you cannot encrypt *to*. So the envelope is opened
in our process, in memory, for the moment before the enclave call.

**Therefore: "plaintext exists only inside the TEE" is not true of this build, and we don't say it.**
What is true and demonstrable: the position never leaves the browser unencrypted · the public record
holds only hashes · the model that judged it ran in an enclave · and its signature verifies against a
key anyone can look up. Closing that last gap needs an enclave *encryption* key, which we have asked 0G
for; it is a config change on our side, not a redesign.

**One process holds the ciphertext between commits.** Sides can be minutes apart today, not days — the
sealed payloads live in memory (no database, by design). Persisting them as ciphertext on the topic is
the natural fix and is scoped, not done.

**The model is deliberately a weaker one.** `0gm-1.0-35b-a3b` has a single provider, so the enclave
signing key cannot rotate out from under our pin. `glm-5.2` is smarter and has three. When the product
is "we can prove who signed this", a stable signer beats a stronger model.

---

## Why each sponsor is load-bearing

Remove any one and the product stops working — not "gets worse".

| Sponsor | What it does here | Remove it and… |
|---|---|---|
| **0G** — sealed inference | The referee no operator can look into, and the signature that proves it ran | the privacy dies; you are trusting us again |
| **Hedera** — HCS + Schedule + Mirror | Commitments and a deadline neither party controls, published before anyone writes | the clock dies; the last to write wins by waiting |
| **World** — Selfie Check | One seat per side per room | probing kills it: open ten rooms, binary-search the other side's number |

Three native Hedera services, **zero Solidity**.

## Architecture

```
app/ (Next.js App Router)
  └── src/{session, seal, worldid, registry, scheduler, evaluator, reveal}
        └── 0G router · @hashgraph/sdk · @worldcoin/idkit
```

Nine modules, each behind a port so the SDKs stay at the edges and the logic is testable without
network, wallet or spend. Env is read in exactly one place (`src/config/env.ts`, Zod, fail-fast).

**Storage *is* the HCS topic** — three versioned message types per session (expiry, commitments,
verdict). No database exists to leak, and none is mocked away in tests: `npm run inspect` reads the
real topic and shows what is there.

The two hard parts, and where they live:
- **`src/evaluator/attest.ts`** — `verifyEnvelope`, the signature check written outside 0G's SDK.
- **`src/seal/`** — client-side sealing and the commitment. Sealing is randomised on purpose: identical
  plaintexts must not produce identical ciphertexts, or an attacker confirms a guessed position by
  comparison.

## Getting started

```bash
cp .env.example .env.local   # 0G (mainnet), Hedera testnet, World
npm install
npm run dev
```

`.env.example` documents every value, including which ones cost money and which are public. Two notes
that will otherwise cost you an hour: the 0G ledger has a **3 0G account-opening floor** unrelated to
usage (a call is ~0.0005 0G), and the phone flow needs an **HTTPS origin** — browsers disable WebCrypto
on plain-HTTP LAN addresses, which kills both the World bridge and our own sealing, silently.

```bash
npm run test        # 362 unit + component tests
npm run typecheck && npm run lint && npm run build
```

## Docs

Start at **[docs/README.md](./docs/README.md)** — vision, architecture, data model, module specs
(RF/RNF), sponsor integrations, security & privacy, and the decision ledger with the arguments that
were rejected and why.

AI attribution: **[docs/ai-usage.md](./docs/ai-usage.md)**. Working with Claude Code:
**[CLAUDE.md](./CLAUDE.md)**.

## Team

Two AI-assisted workstreams (`develop-frank`, `develop-dylan`) merging into `develop`, released to
`main`. Pull-based from [docs/backlog.md](./docs/backlog.md); see
[docs/branching-strategy.md](./docs/branching-strategy.md).
