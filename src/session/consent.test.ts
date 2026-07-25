import { describe, it, expect } from "vitest";
import { consentFromCommitments } from "./consent";
import { buildCommitmentMessage, parseTopicMessage, type CommitmentMessage } from "./messages";

const HASH = "a".repeat(64);

function commitment(side: "A" | "B", gapOptIn: boolean): CommitmentMessage {
  return buildCommitmentMessage({
    roomId: "r_1",
    side,
    commitment: HASH,
    worldNullifier: `0x${side}`,
    gapOptIn,
    submittedAt: "2026-07-26T06:12:04Z",
  });
}

describe("consentFromCommitments (S2.8 — D9 amended)", () => {
  it("both sides consented → { a: true, b: true }", () => {
    expect(consentFromCommitments([commitment("A", true), commitment("B", true)])).toEqual({
      a: true,
      b: true,
    });
  });

  it("one side declined → only that side is false", () => {
    expect(consentFromCommitments([commitment("A", true), commitment("B", false)])).toEqual({
      a: true,
      b: false,
    });
  });

  it("a side with NO commitment has not consented (absent ⇒ no)", () => {
    expect(consentFromCommitments([commitment("A", true)])).toEqual({ a: true, b: false });
    expect(consentFromCommitments([])).toEqual({ a: false, b: false });
  });

  it("a legacy commitment (no gapOptIn field on the topic) counts as no-consent", () => {
    const legacy = parseTopicMessage({
      v: 1,
      type: "commitment",
      roomId: "r_1",
      side: "A",
      commitment: HASH,
      worldNullifier: "0xA",
      submittedAt: "2026-07-26T06:12:04Z",
    }) as CommitmentMessage;
    expect(consentFromCommitments([legacy, commitment("B", true)])).toEqual({
      a: false,
      b: true,
    });
  });

  it("duplicate commitments for a side must ALL consent — a duplicate can only downgrade", () => {
    expect(
      consentFromCommitments([commitment("A", true), commitment("A", false), commitment("B", true)]),
    ).toEqual({ a: false, b: true });
  });
});
