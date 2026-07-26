<p align="center">
  <img src="branding/logo-512.png" alt="Overlap" width="140" />
</p>

<h1 align="center">Overlap</h1>

<p align="center">
  <strong>Stop negotiating deals that were never possible.</strong><br/>
  One line. No leaks.
</p>

<p align="center">
  <img alt="ETHGlobal Lisbon 2026" src="https://img.shields.io/badge/ETHGlobal-Lisbon%202026-6366f1" />
  <img alt="tests" src="https://img.shields.io/badge/tests-445%20passing-3fb950" />
  <img alt="Solidity" src="https://img.shields.io/badge/Solidity-none-8957e5" />
  <img alt="database" src="https://img.shields.io/badge/database-none-8957e5" />
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000" />
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-3fb950" />
</p>

Overlap is a **sealed negotiation room**. Two sides write their terms in plain language; a model
running inside a hardware enclave reads both and returns **one word to both** — whether a deal is
possible — without either side, or the people who built this, ever seeing the other's terms.

> A referee locked in a windowless room. You both slide a paper under the door. The referee says
> "yes" or "no" through the door. Then the papers burn.

---

## Table of contents

- [🎯 The problem](#-the-problem)
- [⚙️ How it works](#️-how-it-works)
- [🔬 Verify our claims yourself](#-verify-our-claims-yourself)
- [⚖️ What we prove, and what we don't](#️-what-we-prove-and-what-we-dont)
- [🏆 Why each sponsor is load-bearing](#-why-each-sponsor-is-load-bearing)
- [🏗️ Architecture](#️-architecture)
- [🚀 Getting started](#-getting-started)
- [📚 Documentation](#-documentation)
- [👥 Team & workflow](#-team--workflow)
- [📄 License](#-license)

## 🎯 The problem

Two people want a deal — a flat, a job offer, a block trade. Neither will name their number first,
because whoever speaks first loses ground. So they circle, or they use a broker who ends up knowing
everything, or the deal dies before the first call.

The obvious fix is software that reads both numbers and says yes or no. The obvious problem with
that fix is that **now the operator knows both numbers** — you have moved the trust, not removed it.

Overlap removes it. The only thing that reads both sides is a model inside an enclave the machine's
own owner cannot look into, and it may only answer with **one word from a fixed list**.

## ⚙️ How it works

```
Side A opens a room       → deadline published to Hedera BEFORE anyone writes
Both sides write + seal   → ECIES-encrypted in the browser; plaintext never travels
One seat per person       → World ID, one nullifier per room: the two sides are two humans
Commitments locked        → sha256(ciphertext) + timestamp to an HCS topic
Sealed evaluation         → pinned model, temperature 0, inside a 0G TEE
Attestation verified      → FAILS CLOSED: no valid signature ⇒ no verdict, ever
Verdict published         → written to the topic; both sides read it via Mirror Node
```

The vocabulary is closed, and that is a privacy control rather than a UI choice. The enclave is the
only thing that has seen both sides, so **anything it emits flows to both** — free text would leak
the other side's terms.

| Verdict | Meaning |
|---|---|
| `workable` | A deal is possible |
| `not_workable` | It is not |
| `gap:single` | One issue is in the way — you are one phone call away |
| `gap:multiple` | More than one thing is in the way |

`gap:*` requires **both** sides to opt in, and consent is read from the two commitment messages on
the topic — never from the create form, which is only side A's preference. Naming *which* dimension
blocks was designed and then rejected: "the timing blocks" also says "your price was acceptable",
and the other side walks into the next call knowing it.

## 🔬 Verify our claims yourself

The whole product rests on one thing: that a model really ran inside an enclave and signed what it
returned. So don't take our word for it — every claim above has a command.

| Command | What it proves |
|---|---|
| `npm run spike` | Verifies a **real enclave signature** against our pinned key using `@noble/*` only — no 0G code in the trust path. Then flips one character and shows it rejected. |
| `npm run reveal:live` | The **whole loop** against real Hedera + real 0G: room → seal → commit → enclave → verify → publish → read back. |
| `npm run inspect` | Shows our topic holds **only hashes** — no plaintext, no key. |
| `npm run demo:naive` | The same product built **without** the enclave: the operator reads both positions in the clear. Add `-- --live` to watch the real enclave return the identical verdict. |

**A verdict that already exists on-chain:** room `r_live_ms0v9ctq` on our HCS topic, produced by the
run above. Signature verified, model recorded, readable by anyone through Mirror Node.

**The enclave key, checked without us in the path.** `OG_ENCLAVE_PUBKEY` is
`0x0038f716958a90b753da6937787395e2365db2e8` — the enclave's `teeSignerAddress`. Read it straight
off 0G mainnet:

```bash
curl -s -X POST https://evmrpc.0g.ai -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x47340d900bdFec2BD393c626E12ea0656F938d84","data":"0x15a523020000000000000000000000004870cbc4d07d6ac2ee5aa865588e5985fe77a4e9"},"latest"]}' \
  | tr -d '\n' | sed 's/.*"result":"0x//;s/".*//' | fold -w64 | sed -n '11p;12p'
```

## ⚖️ What we prove, and what we don't

A demo that overstates its guarantees loses to one question. So, plainly:

**We verify the last link.** We take the enclave's signature and check it against a key we pinned,
with general-purpose crypto we control. We do **not** parse the Intel TDX quote or walk the
certificate chain to an Intel root. That is a real, independently reproducible check — and it is
that one, not more.

**The unsealing happens on our server today.** The browser encrypts to a key, but 0G's inference API
is a chat endpoint: there is nowhere to hand it a private key and have it decrypt inside the
enclave, and the only key 0G exposes is a 20-byte signing address you cannot encrypt *to*. So the
envelope is opened in our process, in memory, for the moment before the enclave call.

**Therefore "plaintext exists only inside the TEE" is not true of this build, and we don't say it.**
What is true and demonstrable: the position never leaves the browser unencrypted · the public record
holds only hashes · the model that judged it ran in an enclave · its signature verifies against a
key anyone can look up. Closing that last gap needs an enclave *encryption* key, which we have asked
0G for; it is a config change on our side, not a redesign.

**One process holds the ciphertext between commits.** Sides can be minutes apart today, not days —
the sealed payloads live in memory (no database, by design). Persisting them as ciphertext on the
topic is the natural fix, and it is scoped rather than done.

**The model is deliberately a weaker one.** `0gm-1.0-35b-a3b` has a single provider, so the enclave
signing key cannot rotate out from under our pin. `glm-5.2` is smarter and has three. When the
product is "we can prove who signed this", a stable signer beats a stronger model.

## 🏆 Why each sponsor is load-bearing

Remove any one and the product stops working — not "gets worse".

| Sponsor | What it does here | Remove it and… |
|---|---|---|
| **0G** — sealed inference | The referee no operator can look into, and the signature that proves it ran | the privacy dies; you are trusting us again |
| **Hedera** — HCS + Schedule + Mirror | Commitments and a deadline neither party controls, published before anyone writes | the clock dies; the last to write wins by waiting |
| **World** — World ID | One seat per **person** per room: a side submits once, and one human cannot hold both seats | probing kills it: re-submit against your counterparty's committed position and binary-search their number |

Three native Hedera services, **zero Solidity**.

## 🏗️ Architecture

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

| Where | What makes it hard |
|---|---|
| `src/evaluator/attest.ts` | `verifyEnvelope` — the signature check, written **outside** 0G's SDK so the SDK never judges its own attestation. |
| `src/seal/` | Client-side sealing and the commitment. Sealing is randomised **on purpose**: identical plaintexts must not produce identical ciphertexts, or an attacker confirms a guessed position by comparison. |

## 🚀 Getting started

```bash
cp .env.example .env.local   # 0G (mainnet), Hedera testnet, World
npm install
npm run dev
```

`.env.example` documents every value, including which ones cost money and which are public. Two
notes that will otherwise cost you an hour:

- The 0G ledger has a **3 0G account-opening floor**, unrelated to usage — a call is ~0.0005 0G.
- The phone flow needs an **HTTPS origin**. Browsers disable WebCrypto on plain-HTTP LAN addresses,
  which kills both the World bridge and our own sealing — silently, with no error anywhere.

```bash
npm run test        # 445 unit + component tests
npm run typecheck && npm run lint && npm run build
```

## 📚 Documentation

| | |
|---|---|
| **[docs/README.md](./docs/README.md)** | The index: vision, architecture, HCS data model, module specs (RF/RNF), sponsor integrations, security & privacy — and the decision ledger, which records the arguments we **rejected** and why. |
| **[docs/ai-usage.md](./docs/ai-usage.md)** | AI attribution: which files were AI-assisted, and which judgement calls the AI made. |
| **[CLAUDE.md](./CLAUDE.md)** | Working context for Claude Code — hard rules, guardrails, Definition of Done. |
| **[docs/backlog.md](./docs/backlog.md)** | Every item, with the evidence and reasoning behind each decision. |

## 👥 Team & workflow

Two AI-assisted workstreams (`develop-frank`, `develop-dylan`) merging into `develop`, released to
`main`. Work is pull-based from the backlog; branching rules in
**[docs/branching-strategy.md](./docs/branching-strategy.md)**.

Every item ships tested, story'd where it has UI, and documented — a component is not done because
it runs.

## 📄 License

[MIT](./LICENSE) © Frank A. Broche and Dydymoon.
