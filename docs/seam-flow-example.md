# Seam — worked example (selling a house)

> Case: the **Seller** won't sell for less than **400k**. The **Buyer** won't buy for more than **400k**.
> They overlap exactly at 400k → the verdict is `workable`, but **neither discovers the other's number**.

## Full sequence

```mermaid
sequenceDiagram
    actor A as Seller (floor ≥ 400k)
    participant BA as Browser A
    participant H as Hedera (HCS + clock)
    participant W as World ID
    participant BB as Browser B
    actor B as Buyer (cap ≤ 400k)
    participant OG as 0G enclave (sealed)

    Note over A,H: 0 · Open the room
    A->>H: Create room + set deadline
    H->>H: Write EXPIRY to the topic (before anything)
    H-->>A: Room link / QR
    Note right of H: The clock is public BEFORE<br/>anyone writes a single word

    Note over A,B: 1 · One seat per side (anti-probing)
    A->>W: Selfie Check
    B->>W: Selfie Check
    W-->>BA: nullifier side A
    W-->>BB: nullifier side B

    Note over BA,BB: 2 · Write and seal (in the browser)
    A->>BA: "I won't sell for less than 400k"
    B->>BB: "I won't buy for more than 400k"
    BA->>BA: encrypt with the enclave's public key
    BB->>BB: encrypt with the enclave's public key
    Note right of BB: The server NEVER sees<br/>the plaintext

    Note over BA,H: 3 · Commitments (locked)
    BA->>H: sha256(ciphertext A) + timestamp
    BB->>H: sha256(ciphertext B) + timestamp
    Note right of H: Now nobody can change<br/>their position after the fact

    Note over H,OG: 4-5 · The clock fires → sealed room
    H->>OG: scheduled tx: evaluate (sends both ciphertexts)
    OG->>OG: decrypt BOTH (only time, in memory only)
    OG->>OG: pinned model, temp 0: is floor 400k ≤ cap 400k? → yes
    OG->>OG: sign the verdict (TEE attestation)

    Note over OG,H: 6-7 · Verdict verified (fail closed)
    OG->>H: verifyEnvelope OK → write "workable" to the topic
    Note right of OG: the plaintext "burns"<br/>(it only ever lived inside the enclave)

    Note over H,B: 8 · Both read the same thing (Mirror Node)
    H-->>A: workable
    H-->>B: workable
    Note over A,B: Neither knows the other's number,<br/>only that there IS a deal
```

## What each side learns

| | What they knew | What they learn |
|---|---|---|
| Seller | Their floor = 400k | That a viable deal exists. They do **not** learn the buyer's cap was exactly 400k. |
| Buyer | Their cap = 400k | That a viable deal exists. They do **not** learn the seller's floor was exactly 400k. |

## The variant that proves the value (second demo run)

If the buyer had entered a **cap of 380k**: floor 400k > cap 380k → verdict `not_workable`.
And here is the magic: **neither discovers by how much they missed** (it does not say "you were 20k
apart"). Only "no deal". That second run, where the judges notice how little they learned about each
other, **is the pitch**.

## Note on the optional gap disclosure

If **both** parties opt in, the enclave can additionally say **how many** things block — never which:
`gap:single` (here: only price blocks — one issue away, worth a call) or `gap:multiple` (several
dimensions block, or they're too entangled to attribute to one). But only if **both** consented
beforehand: if one wants the bare answer, everyone gets the bare answer. The model never emits free
text, only that enum (leak control, D9 as amended — naming the dimension was rejected as ill-defined
when several block at once).
