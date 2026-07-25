# 00 · Vision & scope

Status: 🟧 draft · Last updated: 2026-07-24

## The problem

Two parties need to agree on terms and **neither wants to name theirs first** — a candidate and a
company, a buyer and a seller. The obvious solution (a server that takes both positions and promises
not to look) is unusable: the operator is the one party with an incentive to look, and no recruiter is
putting their ceiling into a stranger's database that also talks to the candidate. A plain server
cannot be trusted here, and everyone knows it.

Three things had to become true at once for this to be buildable:

1. The comparison has to be invisible **to the operator too**, and provably so.
2. The deadline has to be enforced by something **neither party owns**.
3. Both submissions must be **provably locked before the reveal**, so nobody can claim afterwards they'd
   have said something different.

That is why there are three sponsors here rather than one.

## Vision

Think of a referee locked in a windowless room. Both sides slide a paper under the door. The referee
says **"workable"** or **"not workable"** through the door. Then the papers burn.

Overlap is that referee. Two sides write a negotiating position in plain language; a model inside a **0G
TEE (sealed inference)** reads both and returns **one enum verdict to both** — nothing about where the
room is, who was further off, or either position. The sealed enclave is the whole reason the product is
usable, not a feature bolted on (D5).

## Why there's an AI

An earlier version used a single number and a comparison. That is too small to be true — a real offer
is **salary, equity, remote days, start date, title, notice period**, and they trade against each other.
Deciding whether two messy positions can fit is a **judgement**, not an inequality, and only something
that sees both sides at once can make it — which is exactly what no ordinary operator can be trusted to
run. This also satisfies **0G's requirement that 0G Compute be used for *inference*** (a numeric
comparison inside a TEE is not inference and would likely be ruled out).

## Objectives

| # | Objective |
|---|-----------|
| O1 | A working, sealed two-party negotiation demoable **across two browsers** with a QR to join. |
| O2 | Three **load-bearing** sponsors (0G · Hedera · World) — removing any one breaks the product. |
| O3 | The security claim holds under scrutiny: attestation verified **independently**, fail closed (D10). |
| O4 | **No database, no smart contract, no Solidity** (D3/D4). Storage is the HCS topic. |
| O5 | A precise, honest technical story for the Q&A (what the attestation proves, and what it doesn't). |

## Hackathon scope

- **36 hours.** Submission deadline **Sunday 26 July, 09:00 WEST**; feature freeze Saturday 22:00 to
  record the video, submit ~2h early.
- **In scope:** the eight modules (`M1`–`M8`), the three sponsor integrations, the two demo scripts
  (`inspect.ts` shows our store holds only ciphertext; `demo-naive.ts` shows the same product without the
  enclave leaking plaintext), and the World testing doc.
- **Out of scope (deliberately):**
  - **No money movement.** Hedera's agentic-payments track is a bigger pool but requires a real payment
    or token transfer. Overlap moves no money — **don't bolt one on** to reach for it.
  - **No user wallets / no user private keys** (D8). We hold only our own Hedera testnet account key.
  - **No database** (D4). No Notion, no email, no calendar.
  - **No Solidity / no contracts** (D3).

## Modules

| ID | Module | Backlog |
|----|--------|---------|
| M1 | `session` — create room, publish deadline to HCS before any write, issue link/QR | S1.2 |
| M2 | `seal` (client) — in-browser hybrid encryption to enclave key; deterministic commitment | S1.4 |
| M3 | `worldid` — Selfie Check, one nullifier per room per side | S1.5 |
| M4 | `registry` — write commitments + verdict to HCS, read via Mirror Node | S1.3 / S2.5 / S2.6 |
| M5 | `scheduler` — arm + listen for the scheduled reveal | S2.4 |
| M6 | `evaluator` — 0G call, pinned model, temp 0, constrained enum output | S2.2 |
| M7 | `attest` — verify the TEE signature independently, fail closed | S0.3 / S2.3 |
| M8 | `web` — three screens: create · write+seal · verdict | S3.x |

## Success metrics

- **A working two-browser demo** — one judge scans the QR and becomes the company, the other opens the
  link and becomes the candidate; one line comes back. Run it again with positions that don't fit and let
  them notice how little they learned about each other. **That second run is the pitch.**
- **Three load-bearing sponsors** — the removal test passes for each (see `03-sponsors-prizes.md`).
- **Strong technical Q&A** — precise on what the attestation proves; honest that the model can be wrong
  ("worth a conversation", not "here is the deal") and that reuse across rooms is the probing attack in
  disguise.
- **Video** — 2:30 target, 720p minimum, no AI voiceover (auto-reject).
