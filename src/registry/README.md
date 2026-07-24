# `registry` — read/write the HCS topic

Backlog **S1.3 / S2.5 / S2.6** · lean owner: `dylan` (Hedera) · spec: `docs/modules/M4-registry.md`

Storage **is** the HCS topic (no DB). Files:
- `write.ts` — `sha256(ciphertext)` + timestamp (commitments), and the verdict, to the topic.
- `read.ts` — read commitments + verdict via the **Mirror Node** REST API.

Three **versioned** message types per session (expiry, commitments, verdict). Version them from commit one.
