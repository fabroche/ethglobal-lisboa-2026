import { describe, it, expect, vi } from "vitest";
import { createRegistry } from "./write";
import {
  buildExpiryMessage,
  buildCommitmentMessage,
  createRoom,
} from "@/session";
import type { TopicClient } from "./topic-client";

function fakeClient() {
  const sent: string[] = [];
  const client: TopicClient & { sent: string[] } = {
    sent,
    async submit(message: string) {
      sent.push(message);
      return { topicId: "0.0.42", sequenceNumber: sent.length };
    },
  };
  return client;
}

const EXPIRY = buildExpiryMessage({
  roomId: "r_9f3a",
  deadline: "2026-07-26T09:00:00Z",
  createdAt: "2026-07-26T06:00:00Z",
});

const COMMITMENT = buildCommitmentMessage({
  roomId: "r_9f3a",
  side: "A",
  commitment: "a".repeat(64),
  worldNullifier: "0x8a",
  gapOptIn: false,
  submittedAt: "2026-07-26T06:12:04Z",
});

describe("createRegistry.publishExpiry", () => {
  it("submits the canonical message once and returns the consensus seq", async () => {
    const client = fakeClient();
    const res = await createRegistry(client).publishExpiry(EXPIRY);

    expect(res).toEqual({ topicId: "0.0.42", sequenceNumber: 1 });
    expect(client.sent).toHaveLength(1);
    expect(JSON.parse(client.sent[0]!)).toEqual(EXPIRY);
  });

  it("rejects an invalid message before touching the topic (append-only safety)", async () => {
    const client = fakeClient();
    const spy = vi.spyOn(client, "submit");
    await expect(
      // @ts-expect-error — wrong version must be rejected
      createRegistry(client).publishExpiry({ ...EXPIRY, v: 2 }),
    ).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("createRegistry.publishCommitment", () => {
  it("writes the sha256 commitment, side and nullifier", async () => {
    const client = fakeClient();
    const res = await createRegistry(client).publishCommitment(COMMITMENT);

    expect(res.sequenceNumber).toBe(1);
    const body = JSON.parse(client.sent[0]!);
    expect(body).toMatchObject({
      type: "commitment",
      side: "A",
      commitment: "a".repeat(64),
      worldNullifier: "0x8a",
    });
  });

  it("serialises deterministically (same message → identical bytes)", async () => {
    const c1 = fakeClient();
    const c2 = fakeClient();
    await createRegistry(c1).publishCommitment(COMMITMENT);
    await createRegistry(c2).publishCommitment(COMMITMENT);
    expect(c1.sent[0]).toBe(c2.sent[0]);
  });
});

describe("registry closes the session loop", () => {
  it("is a valid RegistryPort: session.createRoom publishes the expiry through it", async () => {
    const client = fakeClient();
    const registry = createRegistry(client);

    const room = await createRoom(
      { deadlineIso: "2026-07-26T09:00:00Z" },
      {
        registry,
        baseUrl: "https://seam.app",
        now: () => new Date("2026-07-26T06:00:00Z"),
        newRoomId: () => "9f3a",
      },
    );

    expect(room.topicId).toBe("0.0.42");
    expect(room.expirySeq).toBe(1);
    expect(JSON.parse(client.sent[0]!)).toMatchObject({ type: "expiry", roomId: "r_9f3a" });
  });
});
