import type { DecodedMessage } from "./read";

/**
 * Inspection helper for the S4.1 demo: prove our store (the HCS topic) holds ONLY hashes +
 * public metadata — no plaintext, and not even the ciphertext (only `sha256(ciphertext)`
 * reaches the topic, D5/D12). Pure so the "no leak" claim is unit-tested.
 */

/** The only keys each versioned message type may carry — all hashes, enums, ids or timestamps. */
const SAFE_KEYS: Record<string, ReadonlySet<string>> = {
  expiry: new Set(["v", "type", "roomId", "deadline", "createdAt"]),
  commitment: new Set(["v", "type", "roomId", "side", "commitment", "worldNullifier", "submittedAt"]),
  verdict: new Set(["v", "type", "roomId", "verdict", "modelHash", "attestationRef", "publishedAt"]),
};

export interface CommitmentRow {
  seq: number;
  side: string;
  sha256: string;
  worldNullifier: string;
}

export interface InspectSummary {
  total: number;
  byType: Record<string, number>;
  commitments: CommitmentRow[];
  /** Fields outside the safe set — MUST be empty. A non-empty list is a plaintext-leak alarm. */
  unexpectedFields: { seq: number; type: string; key: string }[];
}

export function summarizeTopic(messages: DecodedMessage[]): InspectSummary {
  const byType: Record<string, number> = {};
  const commitments: CommitmentRow[] = [];
  const unexpectedFields: InspectSummary["unexpectedFields"] = [];

  for (const { sequenceNumber, message } of messages) {
    byType[message.type] = (byType[message.type] ?? 0) + 1;

    const allowed = SAFE_KEYS[message.type];
    for (const key of Object.keys(message)) {
      if (!allowed || !allowed.has(key)) {
        unexpectedFields.push({ seq: sequenceNumber, type: message.type, key });
      }
    }

    if (message.type === "commitment") {
      commitments.push({
        seq: sequenceNumber,
        side: message.side,
        sha256: message.commitment,
        worldNullifier: message.worldNullifier,
      });
    }
  }

  return { total: messages.length, byType, commitments, unexpectedFields };
}

/** True iff nothing on the topic falls outside the hash/metadata schema — i.e. no plaintext. */
export function holdsOnlyHashes(summary: InspectSummary): boolean {
  return summary.unexpectedFields.length === 0;
}
