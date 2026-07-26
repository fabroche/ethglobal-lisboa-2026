import { describe, it, expect } from "vitest";
import {
  TOPIC_MESSAGE_VERSION,
  buildExpiryMessage,
  buildCommitmentMessage,
  parseTopicMessage,
  expiryMessageSchema,
} from "./messages";

const ROOM = "r_9f3a";
const HASH = "a".repeat(64);

describe("buildExpiryMessage", () => {
  it("stamps the current version and type", () => {
    const msg = buildExpiryMessage({
      roomId: ROOM,
      deadline: "2026-07-26T09:00:00Z",
      createdAt: "2026-07-26T06:00:00Z",
    });
    expect(msg.v).toBe(TOPIC_MESSAGE_VERSION);
    expect(msg.type).toBe("expiry");
  });

  it("is pure/deterministic — same input yields a deep-equal message", () => {
    const input = {
      roomId: ROOM,
      deadline: "2026-07-26T09:00:00Z",
      createdAt: "2026-07-26T06:00:00Z",
    };
    expect(buildExpiryMessage(input)).toEqual(buildExpiryMessage(input));
  });

  it("rejects a non-ISO deadline", () => {
    expect(() =>
      buildExpiryMessage({ roomId: ROOM, deadline: "next friday", createdAt: "2026-07-26T06:00:00Z" }),
    ).toThrow();
  });

  it("records the use case when given, and rejects one outside the D16 enum", () => {
    const msg = buildExpiryMessage({
      roomId: ROOM,
      useCase: "property",
      deadline: "2026-07-26T09:00:00Z",
      createdAt: "2026-07-26T06:00:00Z",
    });
    expect(msg.useCase).toBe("property");
    expect(() =>
      buildExpiryMessage({
        roomId: ROOM,
        // @ts-expect-error — "poker" is not a use case
        useCase: "poker",
        deadline: "2026-07-26T09:00:00Z",
        createdAt: "2026-07-26T06:00:00Z",
      }),
    ).toThrow();
  });
});

describe("buildCommitmentMessage", () => {
  it("accepts a well-formed sha256 hex commitment", () => {
    const msg = buildCommitmentMessage({
      roomId: ROOM,
      side: "A",
      commitment: HASH,
      worldNullifier: "0x8a",
      gapOptIn: false,
      submittedAt: "2026-07-26T06:12:04Z",
    });
    expect(msg.side).toBe("A");
    expect(msg.v).toBe(TOPIC_MESSAGE_VERSION);
  });

  it("records this side's gap consent explicitly (D9 amended)", () => {
    const msg = buildCommitmentMessage({
      roomId: ROOM,
      side: "B",
      commitment: HASH,
      worldNullifier: "0x8b",
      gapOptIn: true,
      submittedAt: "2026-07-26T06:12:04Z",
    });
    expect(msg.gapOptIn).toBe(true);
  });

  it("rejects a commitment that is not 64 lowercase hex chars", () => {
    expect(() =>
      buildCommitmentMessage({
        roomId: ROOM,
        side: "A",
        commitment: "XYZ",
        worldNullifier: "0x8a",
        gapOptIn: false,
        submittedAt: "2026-07-26T06:12:04Z",
      }),
    ).toThrow();
  });

  it("rejects an unknown side", () => {
    expect(() =>
      buildCommitmentMessage({
        roomId: ROOM,
        // @ts-expect-error — "C" is not a valid side
        side: "C",
        commitment: HASH,
        worldNullifier: "0x8a",
        gapOptIn: false,
        submittedAt: "2026-07-26T06:12:04Z",
      }),
    ).toThrow();
  });
});

describe("commitment gap consent — legacy fail-safe", () => {
  it("a pre-D9-amendment commitment without gapOptIn parses as consent = false", () => {
    const legacy = {
      v: 1,
      type: "commitment",
      roomId: ROOM,
      side: "A",
      commitment: HASH,
      worldNullifier: "0x8a",
      submittedAt: "2026-07-26T06:12:04Z",
    };
    const parsed = parseTopicMessage(legacy);
    expect(parsed.type).toBe("commitment");
    if (parsed.type === "commitment") expect(parsed.gapOptIn).toBe(false);
  });
});

describe("parseTopicMessage", () => {
  it("parses a valid expiry message via the discriminated union", () => {
    const raw = {
      v: 1,
      type: "expiry",
      roomId: ROOM,
      deadline: "2026-07-26T09:00:00Z",
      createdAt: "2026-07-26T06:00:00Z",
    };
    // No `useCase` — a pre-D16 room already on the live topic must keep parsing.
    expect(parseTopicMessage(raw)).toEqual(raw);
  });

  it("parses a valid verdict message via the discriminated union", () => {
    const raw = {
      v: 1,
      type: "verdict",
      roomId: ROOM,
      verdict: "not_workable",
      modelHash: "sha256:abc",
      attestationRef: "att_1",
      publishedAt: "2026-07-26T08:00:03Z",
    };
    expect(parseTopicMessage(raw)).toEqual(raw);
  });

  it("rejects a verdict outside the D9 enum", () => {
    expect(() =>
      parseTopicMessage({
        v: 1,
        type: "verdict",
        roomId: ROOM,
        verdict: "maybe",
        modelHash: "sha256:abc",
        attestationRef: "att_1",
        publishedAt: "2026-07-26T08:00:03Z",
      }),
    ).toThrow();
  });

  it("rejects an unknown message type", () => {
    expect(() => parseTopicMessage({ v: 1, type: "bogus", roomId: ROOM })).toThrow();
  });

  it("rejects an unversioned/legacy message (wrong v)", () => {
    expect(() =>
      expiryMessageSchema.parse({
        v: 2,
        type: "expiry",
        roomId: ROOM,
        deadline: "2026-07-26T09:00:00Z",
        createdAt: "2026-07-26T06:00:00Z",
      }),
    ).toThrow();
  });
});
