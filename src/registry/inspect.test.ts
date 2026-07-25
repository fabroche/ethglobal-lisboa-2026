import { describe, it, expect } from "vitest";
import { summarizeTopic, holdsOnlyHashes } from "./inspect";
import type { DecodedMessage } from "./read";

function dm(seq: number, message: Record<string, unknown>): DecodedMessage {
  return {
    sequenceNumber: seq,
    consensusTimestamp: `${1700000000 + seq}.0`,
    message: message as DecodedMessage["message"],
  };
}

const EXPIRY = { v: 1, type: "expiry", roomId: "r", deadline: "2026-07-26T09:00:00Z", createdAt: "2026-07-26T06:00:00Z" };
const COMMIT_A = { v: 1, type: "commitment", roomId: "r", side: "A", commitment: "a".repeat(64), worldNullifier: "0x8a", submittedAt: "2026-07-26T06:10:00Z" };

describe("summarizeTopic", () => {
  it("counts types and extracts commitment hashes — no plaintext present", () => {
    const s = summarizeTopic([dm(1, EXPIRY), dm(2, COMMIT_A)]);
    expect(s.total).toBe(2);
    expect(s.byType).toEqual({ expiry: 1, commitment: 1 });
    expect(s.commitments[0]).toMatchObject({ seq: 2, side: "A", sha256: "a".repeat(64) });
    expect(holdsOnlyHashes(s)).toBe(true);
  });

  it("flags ANY field outside the hash/metadata schema as a leak", () => {
    const leaky = { ...COMMIT_A, position: "I'll take 100k" };
    const s = summarizeTopic([dm(1, leaky)]);
    expect(holdsOnlyHashes(s)).toBe(false);
    expect(s.unexpectedFields).toContainEqual({ seq: 1, type: "commitment", key: "position" });
  });
});
