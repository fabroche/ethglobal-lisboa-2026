# 01 · Architecture

Status: 🟧 draft · Last updated: 2026-07-24

Layered architecture. **No database** (storage is the HCS topic, D4), **no smart contract**, **no
Solidity** (D3). The client browser does the sealing; the server never holds a decryptable copy of
either position (D5/D8). The verdict is published only after the TEE attestation is verified
**independently** — the gate **fails closed** (D10).

## Layers (single direction)

```
web (React/Next.js UI)
  → Server Actions (Zod at the boundary)         src/app + src/lib/actions
    → module libs                                src/{session,seal,worldid,registry,scheduler,evaluator,attest}
      → external SDKs / services                 0G router · Hedera SDK + Mirror Node · World
```

The UI **never** calls an external SDK directly; business logic never lives in the transport layer.
Every external response is validated with **Zod** (D11).

## C1 — Context

```mermaid
flowchart TB
  A[Side A]:::human
  B[Side B]:::human
  subgraph Overlap
    APP[Overlap Next.js app]
  end
  OG[(0G TEE\nsealed inference)]:::ext
  HED[(Hedera\nHCS · Schedule · Mirror)]:::ext
  WOR[(World\nSelfie Check)]:::ext

  A -- write + seal in browser --> APP
  B -- write + seal in browser --> APP
  APP -- pinned model, enum out --> OG
  APP -- commitments + verdict, deadline --> HED
  APP -- one seat per side --> WOR
  A -- read verdict (Mirror) --> HED
  B -- read verdict (Mirror) --> HED

  classDef ext fill:#eef,stroke:#88a;
  classDef human fill:#efe,stroke:#8a8;
```

There is **no database node** and **no smart-contract node**: the Hedera topic *is* the store.

## C2 — Containers

```mermaid
flowchart LR
  subgraph Browser[Client browser]
    SEAL[seal — hybrid encrypt\nto enclave key\n+ deterministic commitment]
    UI[web UI: create · write+seal · verdict]
  end
  subgraph Server[Overlap app / Next.js]
    ACT[Server Actions + Zod]
    SESSION[session]
    REG[registry write/read]
    SCHED[scheduler]
    EVAL[evaluator]
    ATT[attest — verify TEE sig\noutside the SDK, fail closed]
    WID[worldid]
  end
  OG[(0G router / enclave)]
  HCS[(Hedera HCS topic)]
  SCHEDSVC[(Hedera Schedule Service)]
  MIRROR[(Hedera Mirror Node REST)]
  WORLD[(World Selfie Check)]

  UI --> ACT
  SEAL --> ACT
  ACT --> SESSION --> REG
  SESSION --> SCHED --> SCHEDSVC
  REG --> HCS
  REG --> MIRROR
  ACT --> WID --> WORLD
  SCHEDSVC -. fires reveal .-> EVAL
  EVAL --> OG
  EVAL --> ATT
  ATT -->|verified| REG
  ATT -.->|bad sig ⇒ no verdict| STOP[/fail closed/]
```

**Trust boundaries:**
- **Sealed-evaluation boundary** — plaintext exists **only** inside the 0G enclave, decrypted once,
  then gone ("the papers burn"). Neither the server nor the operator can look in.
- **Attestation gate** — the verdict reaches the HCS topic only if `attest` verifies the enclave
  signature independently of the 0G SDK. Any failure ⇒ no verdict (D10).

## Full-session sequence

```mermaid
sequenceDiagram
    actor A as Side A
    actor B as Side B
    participant APP as Overlap app
    participant H as Hedera
    participant W as World
    participant OG as 0G enclave
    participant M as Mirror Node

    A->>APP: create room + deadline
    APP->>H: publish EXPIRY to topic (before any write)
    H-->>A: link / QR
    A->>W: Selfie Check
    B->>W: Selfie Check
    W-->>A: nullifier (room, side A)
    W-->>B: nullifier (room, side B)
    A->>A: seal position (browser) → ciphertext A
    B->>B: seal position (browser) → ciphertext B
    A->>APP: commitment A = sha256(ciphertext A)
    B->>APP: commitment B = sha256(ciphertext B)
    APP->>H: write COMMITMENT A, COMMITMENT B (versioned)
    H-->>APP: scheduled reveal fires
    APP->>OG: evaluate(ciphertext A, ciphertext B) — pinned model, temp 0
    OG->>OG: decrypt both (once), judge, sign (attestation)
    OG-->>APP: enum verdict + attestation
    APP->>APP: attest.verifyEnvelope(sig, enclave pubkey)
    alt signature valid
      APP->>H: write VERDICT to topic
      A->>M: read verdict
      B->>M: read verdict
    else invalid / missing
      APP--xH: no verdict published (fail closed)
    end
```

## Where things live

| Concern | Home | Notes |
|---------|------|-------|
| Sealing | `src/seal` (runs in the browser) | ciphertext + deterministic commitment (D12) |
| Storage | Hedera HCS topic | three versioned message types (D4) — see `02-data-model.md` |
| The clock | Hedera Schedule Service | armed **before** the work (M5) |
| Read path | Hedera Mirror Node REST | both clients read the verdict (M4) |
| Inference | 0G enclave via OpenAI-compatible router | pinned model, enum output (M6) |
| Trust gate | `src/attest` | `verifyEnvelope` outside the SDK, fail closed (M7) |
| One seat per side | World Selfie Check | nullifier per room per side (M3) |
