/**
 * M2 · `seal` — public surface. See `docs/spec-04-seal.md`.
 *
 * Client-side hybrid encryption of a position to the enclave's key, plus the
 * commitment M4 writes to the HCS topic. Plaintext never leaves the browser (D5).
 *
 * Note there is no `unseal` here on purpose: decryption happens once, inside the
 * 0G TEE. The test-only stand-in lives in `unseal-testkit.ts`.
 */
export {
  seal,
  commitmentOf,
  sealedPayloadSchema,
  SEAL_VERSION,
  SEAL_SUITES,
  DEFAULT_SUITE,
  type SealedPayload,
  type SealResult,
  type SealOptions,
  type SealSuite,
} from "./seal";
