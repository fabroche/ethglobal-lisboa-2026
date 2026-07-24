import { PrivateKey } from "@hashgraph/sdk";

/**
 * Parse a Hedera operator private key from whatever format the portal hands out — a
 * **DER-encoded** key (works for both ECDSA and ED25519, so it's unambiguous) or a raw hex
 * key — so setup doesn't depend on the account's key type. Prefer the DER-encoded key.
 */
export function parseOperatorKey(raw: string): PrivateKey {
  const key = raw.trim();
  const attempts: Array<() => PrivateKey> = [
    () => PrivateKey.fromStringDer(key), // DER: unambiguous for both key types
    () => PrivateKey.fromStringECDSA(key), // raw-hex ECDSA
    () => PrivateKey.fromStringED25519(key), // raw-hex ED25519
  ];
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      // try the next format
    }
  }
  throw new Error(
    "HEDERA_PRIVATE_KEY is not a valid private key (expected DER-encoded, or raw hex ECDSA/ED25519)",
  );
}
