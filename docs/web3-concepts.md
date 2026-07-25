# Web3 concepts — team cheat sheet

> Glossary and plain-language explanations for a **web2** dev with no web3 experience.
> Written off the back of analysing the *Almanac* hackathon prototype. Read it top to bottom:
> each concept builds on the previous one. Web3 terms kept in English (ecosystem convention).

Status: 🟩 reference · Last updated: 2026-07-24

---

## A. The foundations

**Blockchain / "on-chain".** An append-only database replicated across thousands of machines, with
no owner, where each **block** of transactions is chained to the previous one by hash (like a global,
immutable `git log`). "On-chain" = "living in that database". A block is like a commit: it has a number
(**block height**) and freezes the state of the world at that instant. "Pinning" a block = fixing the
exact number so you have reproducible data (not `HEAD`, which changes every ~12s).

**Why querying the chain directly is hell.** A blockchain stores data optimised to *validate*, not to
*query*. There is no `SELECT ... WHERE`. That is why **The Graph** exists (section C).

**Wallet / address / private key / public key.** Public-key cryptography, like an SSH key:
- **Private key**: the secret (like your `id_rsa`). Signs transactions and **moves funds**. Leak it, you're drained.
- **Address** (`0x1234…`): public, like your username/handle. Shared with no risk.
- **Reading** an address's state (balances, positions) needs **no key**: it is public info.
  That is why "read-only" is safe.

**Smart contract.** A program that lives on-chain and runs when invoked (like an immutable, public
lambda). Written in **Solidity** (Ethereum) or **Move** (Sui). Writing/deploying = the expensive and
dangerous part (bugs = money). **Our red line: no writing contracts.** We use SDKs that talk to existing contracts.

**Testnet and gas.** Every on-chain write costs a fee (**gas**) in the network's token. The **testnet**
is a toy copy with free tokens for development. In the hackathon: testnets.

---

## B. The domain: DeFi lending (this is where the accountant partner rules)

> *Kept for reference from the earlier idea; Overlap itself does not use DeFi lending.*

**DeFi lending.** Credit banks without a bank. You deposit crypto as **collateral** and borrow against
it (Aave, Morpho, Compound…). Risk metrics:

| Metric | What it means |
|---|---|
| **maximumLTV** (Loan-To-Value) | How much you can borrow against your collateral (0.75 = 75%). |
| **liquidationThreshold** | If your debt exceeds this % of your collateral, you get **liquidated** (collateral force-sold). |
| **utilisation** | % of the pool that is lent out. A sudden spike (0.62 → 0.94) means you may not be able to withdraw: stress. |
| **borrowRate / tvlUsd** | Loan interest and pool size. |

"Risk" = is this market heading toward a cascade liquidation or a liquidity crunch?

---

## C. Reading the chain: The Graph

> *Also kept for reference; Overlap reads from Hedera's Mirror Node, not The Graph.*

**The Graph** = the "Google + SQL layer" of the blockchain. Someone writes a **subgraph** (a definition
of how to index a contract's events into a queryable API) and you fire normal **GraphQL queries**. It is
the **lowest-risk** part and the one you already know how to do.

- **Subgraph / deployment**: an already-published index.
- **Standardised schema (Messari)**: same shape across protocols → uniform queries.
- **Gateway**: the endpoint you query with your `GRAPH_API_KEY`.
- **Substreams**: the "firehose" version for processing history at high speed (backfill).
- **Subgraph MCP / Token API**: official The Graph tooling so an AI agent (Claude) can query on-chain in
  natural language. Already live.

---

## D. Cryptographic primitives (the heart of the trust tricks)

**Hash (SHA-256).** Turns any data into a fixed-size fingerprint. Same input → same hash; change one
byte → completely different hash. It is what git uses for commits. It "seals" data: if someone alters a
number, the hash gives it away.

**Canonical serialisation** (flagged as hard). For two machines to derive the **same** hash from the
"same" data, you must serialise **byte-for-byte identically**: sort keys recursively, numbers as
fixed-precision **strings**, no nulls, no clock timestamps. Typical traps: JSON key order, decimal
formatting, floating point. Not web3 — pure deterministic engineering. **In Overlap this is the `seal`
commitment (M2): the verifier must recompute the identical `sha256(ciphertext)`.**

**Digital signature.** With your private key you sign a piece of data; anyone with your public key
verifies you signed it and it wasn't touched. Like a notary's seal, or your browser validating a site's
TLS certificate. A TEE's **attestation** is exactly this, but signed by a secure chip.

**Append-only / event sourcing.** You never edit, only append. If something changes, you write a new
entry referencing the old one. The truth is the sum of un-rewindable events. Gaps are visible, so you
can't hide anything.

---

## E. Infrastructures seen in Almanac (and used in Overlap)

**Hedera (registry + clock).** A network with turnkey services via SDK, no contracts:
- **HCS (Hedera Consensus Service) = registry.** A public append-only log with consensus ordering
  (like an **immutable Kafka topic**): each message gets a sequence number and timestamp, and is never
  edited/deleted. A gap in the sequence reveals you hid something. **In Overlap, HCS is the storage — there
  is no database.**
- **Schedule Service = clock.** A trusted on-chain cron that fires periodic execution. **In Overlap, this is
  the deadline: armed before anyone writes, fired regardless of who wants what.**
- **Mirror node = read path.** An API/replica to read without writing. **In Overlap, both sides read the
  verdict here.**

**0G (confidential compute — the hard piece).**
- **TEE (Trusted Execution Environment) / enclave**: a hardware-isolated region of the processor where
  code runs that **not even the machine's owner can see or modify**. Analogy: a safe with a one-way window.
- **Sealed inference**: running the model **inside** the enclave, with the config encrypted and decrypted
  only in there. So not even you can tamper with the result. **This is Overlap's referee.**
- **Attestation**: the "notarised receipt" signed by the chip: "I ran exactly this model on this input,
  no cheating." Verifying it = checking that signature against the enclave's public key.
- **Why it's the risk**: independently verifying TEE attestations is advanced and 0G is a new platform.
  The line you don't cross: if you decrypt the config in your own process, it is no longer sealed.

**x402 (billing).** The HTTP code **402 "Payment Required"** used for real: the API responds 402, the
client automatically pays a crypto micropayment and retries. "Agent-native Stripe": a bot pays per call
with no card and no human. *(Not used in Overlap — Overlap moves no money.)*

---

## F. Agent layer and cross-cutting ideas

**Oracle.** A service that provides trusted data/valuations for others to consume. The value of a
"verifiable" oracle is not the data, it is the **proof its history is honest**.

**MCP (Model Context Protocol).** The protocol by which an AI agent (Claude, Cursor) calls "tools". We
already use it in home-os. It is the public surface of these projects.

**"No database".** You don't need your own DB if the source of truth is reproducible public data +
a public registry (Hedera). Less to maintain **and** a better trust argument (there's no DB of yours you
could rig). **Overlap takes this to the limit: storage IS the HCS topic.**

**Verifier (the trust anchor).** A script that **ignores your service** and goes straight to the public
sources to recompute hashes and re-verify signatures on its own. It is what a judge runs to check you're
not lying. Running it live over one of your inputs = the demo that wins. **In Overlap: `inspect.ts` (our
store holds only ciphertext) and the independent `attest` check.**

---

## G. Extra concepts specific to Overlap (sealed negotiation)

**Commitment scheme.** You publish the **hash** of your data (not the data) to become "committed" to it
without revealing it. Later, on reveal, anyone checks it matches the hash → you couldn't change it after
the fact. In Overlap: `sha256(ciphertext)` goes to Hedera before the verdict, so nobody can later say "I'd
have said something different."

**Hybrid encryption to the enclave key.** The browser encrypts your position **with the 0G enclave's
public key**, so it can only be decrypted **inside** the sealed box. Your server never has a readable
copy. "Hybrid" = public key for the session key + symmetric key for the content (as TLS/PGP do).

**World ID / Selfie Check / nullifier (proof of unique humanity).** World provides proof there is **one
real, unique person** behind a submission, without revealing who. The **nullifier** is a per-context
unrepeatable identifier: "one seat per room, per side". It defends against the **probing (Sybil) attack**:
without it, someone opens 20 sessions varying their position and reconstructs the other's number. The
enclave protects each answer perfectly, but without uniqueness the system loses anyway.

**Constrained / structured output (= leak control).** The model may NOT write free text; it may only
emit an **enum** (`workable` / `not_workable`, or `gap: timing`…). A free paragraph would leak info
("the difference is the start date" already tells you something). Enum in, enum out.

**Fail closed.** If the attestation does not verify, **no verdict is published**. A verdict with no valid
signature looks identical to a good one, and that is worse than no verdict. Security rule: when in doubt,
deny, don't let it through.

**verifyEnvelope (0G).** The official **0G Compute TS SDK** function that verifies the TEE attestation
**offline** (no broker, no touching the chain). It is what makes the "Friday spike" far less risky: the
path to verify the enclave's signature is already published and supported.

---

## Golden rule (web3 difficulty, for scoping)
Reading data (subgraphs/APIs, Mirror Node) = **easy 🟢** · using an SDK that abstracts contracts
(Hedera, 0G, World) = **medium 🟡** · writing/deploying contracts (Solidity, Move, opcodes) =
**expensive 🔴, avoid**. Overlap lives entirely in the green/yellow band (D3).
