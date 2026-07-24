import {
  topicMessageSchema,
  type TopicMessage,
  type ExpiryMessage,
  type CommitmentMessage,
  type VerdictMessage,
} from "@/session";
import type { MirrorClient, MirrorMessage } from "./mirror-client";

/**
 * The read path (M4 · S2.5). Reads a session back from the HCS topic via Mirror Node and
 * validates every message with Zod (D11) — a malformed message is **rejected, not silently
 * coerced** — so two independent readers derive the identical view. Also fails on a
 * **sequence gap**, which on an append-only log is a tamper signal (RNF-M4-001).
 */

export interface DecodedMessage {
  sequenceNumber: number;
  consensusTimestamp: string;
  message: TopicMessage;
}

export interface SessionView {
  messages: DecodedMessage[];
  expiry?: ExpiryMessage;
  commitments: CommitmentMessage[];
  verdict?: VerdictMessage;
}

/** Decode one Mirror entry: base64 → JSON → Zod. Throws on any malformed step. */
export function decodeMirrorMessage(raw: MirrorMessage): DecodedMessage {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(raw.message, "base64").toString("utf8"));
  } catch {
    throw new Error(`topic message at seq ${raw.sequence_number} is not valid JSON`);
  }
  // Throws on unknown type, wrong version, or a shape that doesn't match its schema.
  const message = topicMessageSchema.parse(json);
  return {
    sequenceNumber: raw.sequence_number,
    consensusTimestamp: raw.consensus_timestamp,
    message,
  };
}

/** Throw if the (ascending) sequence numbers are not contiguous — a gap betrays tampering. */
export function assertContiguous(decoded: DecodedMessage[]): void {
  for (let i = 1; i < decoded.length; i++) {
    const prev = decoded[i - 1]!.sequenceNumber;
    const cur = decoded[i]!.sequenceNumber;
    if (cur !== prev + 1) {
      throw new Error(`sequence gap between ${prev} and ${cur} (possible tampering)`);
    }
  }
}

export interface Reader {
  readSession(topicId: string, opts?: { roomId?: string }): Promise<SessionView>;
}

/** Build a reader over an injected {@link MirrorClient}. */
export function createReader(client: MirrorClient): Reader {
  return {
    async readSession(topicId, opts) {
      const raw = await client.fetchTopicMessages(topicId);
      const decoded = raw
        .slice()
        .sort((a, b) => a.sequence_number - b.sequence_number)
        .map(decodeMirrorMessage);
      assertContiguous(decoded);

      const roomId = opts?.roomId;
      const scoped = roomId
        ? decoded.filter((d) => d.message.roomId === roomId)
        : decoded;

      const view: SessionView = { messages: scoped, commitments: [] };
      for (const { message } of scoped) {
        if (message.type === "expiry") view.expiry = message;
        else if (message.type === "commitment") view.commitments.push(message);
        else view.verdict = message;
      }
      return view;
    },
  };
}
