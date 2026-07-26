# Judge Q&A — the ten questions that decide it

Status: 🟧 draft. One crisp answer each; say these out loud before the demo. Sources linked so you
can go one level deeper if pressed.

**1. "Why do you need an LLM at all — isn't `floor ≤ cap` just arithmetic?"**
Because positions are free-form, multi-dimensional and traded off ("380k if the deed is in 30
days, else 400k"). Structured fields would reduce it to arithmetic — that's exactly the design we
rejected (D16): a parser has no privacy-safe place to live, and plain language is what real
negotiators write. The judgment call *is* the product; the enclave is what makes it trustable.

**2. "What stops me probing — submitting twenty positions to reconstruct the other side's number?"**
Three controls that only work together (`transversal/security-and-privacy.md` §b): the enclave
hides inputs from us, the **enum keeps each answer to ~a bit** of signal, and the **World
nullifier (one seat per room per side)** removes repetition. Remove any one and the seal breaks.
Reusing positions across rooms is the same attack — that's why the nullifier is per-room-per-side
(DA4), and why World is load-bearing, not decorative.

**3. "What exactly leaks when there's no deal?"**
By default: one bit — `not_workable`, not by how much, not on what. With BOTH sides' opt-in
(consent rides each side's commitment message): `gap:single` or `gap:multiple` — how MANY
dimensions block, never which. We amended D9 mid-event when we realised "name the single blocking
dimension" was ill-defined (several can block; entangled tradeoffs have no unique blocker) and
leaked more than it seemed. Dimensions (compensation/timing/scope) survive only inside the
enclave as the counting basis.

**4. "Why should I believe the enclave ran the model you claim?"**
**Fail closed** (D10): the verdict is published only if the TEE attestation verifies
**independently of the 0G SDK** (`verifyEnvelope`, our own signature check — spec-03). No valid
attestation ⇒ no verdict on the topic, and both sides see nothing rather than something wrong.
The verdict entry carries the pinned model hash + attestation ref.

**5. "Is temp-0 output reproducible? Could you re-run and get a different verdict?"**
Honest answer: temp 0 + pinned model hash is NOT a run-to-run reproducibility guarantee
(RNF-M6-002). What we prove is narrower and sufficient: *this* model saw *these* committed
inputs and returned *this* verdict, attested. Nobody signs on the output — Overlap says whether a
conversation is worth having.

**6. "Where's your database?"**
There isn't one (D4). Storage IS the Hedera Consensus Service topic: three versioned message
types (expiry, commitment×2, verdict), append-only, consensus-timestamped, sequence gaps betray
tampering. `npm run inspect` shows our store holds only hashes. The server briefly holds sealed
**ciphertexts** for the reveal — no key to open them exists outside the enclave.

**7. "Why is the deadline on-chain before anyone writes?"**
So the clock can't be leverage (RNF-M1-001). The expiry is public on the topic before either
side commits a word; the scheduled reveal (Hedera Schedule Service) fires it. Opener can't
shorten the window after seeing you're interested.

**8. "You hold the users' keys?"**
No keys, no wallets, nothing to sign (D8). The only private key anywhere is our own Hedera
testnet account that writes to the topic. Users' positions are sealed in-browser to the
enclave's **encryption** key (distinct from the attestation key — three-key taxonomy).

**9. "No Solidity — so what's the Hedera work?"**
Three native services, zero contracts (D3/D6): HCS topic = the registry, Schedule Service = the
clock, Mirror Node = the read path both browsers poll. That's the "No Solidity Allowed" track
verbatim.

**10. "How much of this did the AI build?"**
Disclosed in full — `docs/ai-usage.md` (mandatory attribution): AI drafts under human direction,
every line human-reviewed, granular commit history all weekend. The decisions that shaped the
system were human — the Overlap pivot, the D16 preset choice, and the D9 amendment (a human caught
the AI's flawed design and replaced it). Ask us anything about the architecture; that's what the
review discipline was for.
