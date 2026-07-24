# T · Integration — World (Selfie Check)

Status: 🟧 draft · Last updated: 2026-07-24

World gives us **one seat per side**. It is used as an **abuse signal, not a login** (D7). Underpins
module **M3** (`worldid`).

---

## 1. Why it is load-bearing — the probing attack

The enclave protects each individual answer perfectly. The system still loses without one-seat:

> A probing attacker opens **twenty sessions with slightly varied positions** and, from the pattern of
> `workable` / `not_workable` answers, **reconstructs the other side's number**. One round of probing
> breaks the seal.

Selfie Check issues **one nullifier per room per side**, so each side can submit **once per room**.
Remove World and the enclave is still perfect and the product is still broken. (See
`transversal/security-and-privacy.md` for how enclave + enum output + one-seat close the attack
*together* — no single one is sufficient.)

## 2. Nullifier scope — per room, per side (not app-wide)

```
WORLD_APP_ID=
WORLD_ACTION=          # scoped per room at runtime
```

- **App-wide scope** would mean a person can use Seam **exactly once, ever** — useless.
- **Per-room scope** means a person can negotiate **many rooms** but submit **once per side per room**.
- We scope `WORLD_ACTION` to the room at runtime so the derived nullifier is unique to
  `(room, side)`. A second submission from the same nullifier in the same room+side is **rejected**.
- Confirm at the World booth that a nullifier can be scoped per session/room rather than per app
  (see §4).

```mermaid
flowchart LR
  U[Person] --> SC[Selfie Check]
  SC -->|nullifier scoped to room+side| G{seen this nullifier in room+side?}
  G -- no --> OK[accept single submission]
  G -- yes --> REJ[/reject/]
```

## 3. Testing documentation (track requirement)

The World track **requires a testing doc covering developer friction AND user friction**. Start it
**Saturday morning while the friction is fresh** — it is a real deliverable, not an afterthought.

It must contain, at minimum:

- **Developer friction** — integration steps taken; SDK/API friction encountered; what the docs got
  right/wrong; nullifier-scoping setup; anything that cost us time.
- **User friction** — the Selfie Check UX from a real user's perspective; how long it took; where a
  first-time user hesitates or drops off; device/permission prompts.

## 4. Workshop questions to confirm (World — Friday 16:30)

- Can a Selfie Check **nullifier be scoped per session/room rather than per app**?
- What exactly must the **testing documentation** contain to qualify?
