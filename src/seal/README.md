# `seal` (client) — encrypt in-browser to the enclave key

Backlog **S1.4** · lean owner: `frank` (0G) · spec: `docs/modules/M2-seal.md` · **one of the two hard parts**

Hybrid-encrypt the position **in the browser** to the 0G enclave public key, so the server never holds
a decryptable copy. Deterministic serialisation of the committed bytes; hash the ciphertext; **never let
a timestamp sneak into the committed bytes** (the commitment must match what the verifier recomputes).
