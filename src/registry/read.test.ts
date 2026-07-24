import { describe, it, expect } from "vitest";
import { createReader, decodeMirrorMessage, assertContiguous } from "./read";
import type { MirrorClient, MirrorMessage } from "./mirror-client";

const ROOM = "r_9f3a";

/** Encode a topic message the way Mirror Node returns it (base64 in `message`). */
function entry(seq: number, body: unknown): MirrorMessage {
  return {
    consensus_timestamp: `${1700000000 + seq}.000000000`,
    message: Buffer.from(JSON.stringify(body), "utf8").toString("base64"),
    sequence_number: seq,
    topic_id: "0.0.42",
  };
}

const EXPIRY = { v: 1, type: "expiry", roomId: ROOM, deadline: "2026-07-26T09:00:00Z", createdAt: "2026-07-26T06:00:00Z" };
const COMMIT_A = { v: 1, type: "commitment", roomId: ROOM, side: "A", commitment: "a".repeat(64), worldNullifier: "0x8a", submittedAt: "2026-07-26T06:10:00Z" };
const COMMIT_B = { v: 1, type: "commitment", roomId: ROOM, side: "B", commitment: "b".repeat(64), worldNullifier: "0x8b", submittedAt: "2026-07-26T06:11:00Z" };
const VERDICT = { v: 1, type: "verdict", roomId: ROOM, verdict: "not_workable", modelHash: "sha256:abc", attestationRef: "att_1", publishedAt: "2026-07-26T08:00:03Z" };

function fakeClient(messages: MirrorMessage[]): MirrorClient {
  return { async fetchTopicMessages() { return messages; } };
}

describe("decodeMirrorMessage", () => {
  it("decodes a valid base64/JSON/Zod message", () => {
    const d = decodeMirrorMessage(entry(1, EXPIRY));
    expect(d.sequenceNumber).toBe(1);
    expect(d.message).toEqual(EXPIRY);
  });

  it("rejects non-JSON payloads (not silently coerced)", () => {
    const bad: MirrorMessage = { ...entry(1, {}), message: Buffer.from("not json", "utf8").toString("base64") };
    expect(() => decodeMirrorMessage(bad)).toThrow(/not valid JSON/);
  });

  it("rejects a well-formed JSON that fails the schema", () => {
    expect(() => decodeMirrorMessage(entry(1, { v: 1, type: "verdict", roomId: ROOM, verdict: "maybe" }))).toThrow();
  });
});

describe("assertContiguous", () => {
  it("throws on a sequence gap (tamper signal)", () => {
    const decoded = [entry(1, EXPIRY), entry(3, COMMIT_A)].map(decodeMirrorMessage);
    expect(() => assertContiguous(decoded)).toThrow(/sequence gap/);
  });
});

describe("createReader.readSession", () => {
  it("builds a structured, validated view of the session", async () => {
    const reader = createReader(fakeClient([entry(1, EXPIRY), entry(2, COMMIT_A), entry(3, COMMIT_B), entry(4, VERDICT)]));
    const view = await reader.readSession("0.0.42", { roomId: ROOM });

    expect(view.expiry).toEqual(EXPIRY);
    expect(view.commitments).toHaveLength(2);
    expect(view.verdict?.verdict).toBe("not_workable");
  });

  it("sorts out-of-order Mirror entries by sequence before validating", async () => {
    const reader = createReader(fakeClient([entry(4, VERDICT), entry(2, COMMIT_A), entry(1, EXPIRY), entry(3, COMMIT_B)]));
    const view = await reader.readSession("0.0.42");
    expect(view.messages.map((m) => m.sequenceNumber)).toEqual([1, 2, 3, 4]);
  });

  it("is deterministic — two reads of the same topic yield the identical verdict", async () => {
    const msgs = [entry(1, EXPIRY), entry(2, COMMIT_A), entry(3, COMMIT_B), entry(4, VERDICT)];
    const a = await createReader(fakeClient(msgs)).readSession("0.0.42");
    const b = await createReader(fakeClient(msgs)).readSession("0.0.42");
    expect(a.verdict).toEqual(b.verdict);
  });
});
