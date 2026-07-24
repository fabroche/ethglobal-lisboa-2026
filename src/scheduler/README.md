# `scheduler` — the deadline clock

Backlog **S2.4** · lean owner: `dylan` (Hedera) · spec: `docs/modules/M5-scheduler.md`

Arm and listen for the **Hedera Scheduled Transaction** that fires the reveal on time, regardless of who
wants what. **Arm the next step before doing work, not after** — a crash must not silently stop the clock.
