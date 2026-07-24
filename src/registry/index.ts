/**
 * M4 · `registry` — the storage layer (there is no database, D4). The HCS topic *is* the
 * store. This is the write path (S1.3): append versioned `expiry` and `commitment` messages.
 * Mirror Node reads land in S2.5. See `docs/modules/M4-registry.md`.
 */
export { canonicalJson } from "./canonical";
export { createRegistry, type Registry } from "./write";
export { hederaTopicClient, type TopicClient } from "./topic-client";
