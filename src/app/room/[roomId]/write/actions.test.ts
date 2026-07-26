import { describe, it, expect, vi, beforeEach } from "vitest";
import { commitmentOf, type SealedPayload } from "@/seal";
import type { WorldProof } from "@/worldid";

/**
 * S3.24(a)+(c) — hardening against duplicate commitments. The seat registry is
 * per-process, so the durable guard is the topic check, and the ciphertext vault must
 * never overwrite: the reveal judges the OLDEST commitment per side, so the stored
 * payload has to stay the one that commitment binds.
 */
const readSession = vi.fn();
const publishCommitment = vi.fn();

vi.mock("@/config/env", () => ({
  env: { OG_ENCLAVE_SEAL_PUBKEY: null, WORLD_APP_ID: null },
  requireEnv: (name: string) => `test-${name}`,
}));
vi.mock("@/registry", () => ({
  createReader: () => ({ readSession }),
  createRegistry: () => ({ publishCommitment }),
  hederaMirrorClient: () => ({}),
  hederaTopicClient: () => ({}),
}));
// Real schemas, fake seat claim: these tests are about the vault and the topic check,
// and a claim that always succeeds is exactly the "guard restarted/other instance" case.
vi.mock("@/worldid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/worldid")>();
  return {
    ...actual,
    cloudWorldVerifier: () => ({ verify: async () => ({ success: true, nullifierHash: "0xn" }) }),
    claimSeat: vi.fn(async (_input, deps) => ({ seats: deps.seats, nullifierRef: "0xn" })),
  };
});

import { submitCommitmentAction, getSealedPayloads } from "./actions";
import { claimSeat } from "@/worldid";

const PROOF: WorldProof = {
  merkle_root: "0xroot",
  nullifier_hash: "0xnull",
  proof: "0xproof",
  verification_level: "orb",
};

function payloadFor(label: string): SealedPayload {
  // Distinct single hex byte per label keeps the payloads valid AND distinguishable.
  return { v: 1, suite: "x25519-hkdf-sha256-aes256gcm", epk: "aa".repeat(32), ciphertext: label };
}

function inputFor(roomId: string, side: "A" | "B", ciphertext: string) {
  const sealedPayload = payloadFor(ciphertext);
  return {
    roomId,
    side,
    sealedPayload,
    commitment: commitmentOf(sealedPayload),
    worldProof: PROOF,
    gapOptIn: false,
  };
}

beforeEach(() => {
  readSession.mockReset().mockResolvedValue({ expiry: undefined, commitments: [], verdict: undefined });
  publishCommitment.mockReset().mockResolvedValue({ sequenceNumber: 1 });
  vi.mocked(claimSeat).mockClear();
});

describe("submitCommitmentAction — the topic is the durable backstop (S3.24c)", () => {
  it("rejects a side that already has a commitment on the topic, before the World gate", async () => {
    readSession.mockResolvedValue({
      expiry: undefined,
      commitments: [{ v: 1, type: "commitment", roomId: "r_dup", side: "A", gapOptIn: true }],
      verdict: undefined,
    });

    const result = await submitCommitmentAction(inputFor("r_dup", "A", "01"));

    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/already committed/i) });
    // A doomed submit must consume neither the person's World verification nor a topic write.
    expect(claimSeat).not.toHaveBeenCalled();
    expect(publishCommitment).not.toHaveBeenCalled();
  });

  it("lets the OTHER side through when only one side committed", async () => {
    readSession.mockResolvedValue({
      expiry: undefined,
      commitments: [{ v: 1, type: "commitment", roomId: "r_other", side: "A", gapOptIn: true }],
      verdict: undefined,
    });

    const result = await submitCommitmentAction(inputFor("r_other", "B", "02"));
    expect(result).toMatchObject({ ok: true });
    expect(publishCommitment).toHaveBeenCalledTimes(1);
  });

  it("does not block the write path when Mirror is down — the seat claim still guards", async () => {
    readSession.mockRejectedValue(new Error("mirror unreachable"));

    const result = await submitCommitmentAction(inputFor("r_mirror_down", "A", "03"));
    expect(result).toMatchObject({ ok: true });
  });
});

describe("the ciphertext vault never overwrites (S3.24a)", () => {
  it("keeps the FIRST payload when a duplicate slips past every guard", async () => {
    const first = await submitCommitmentAction(inputFor("r_vault", "A", "04"));
    expect(first).toMatchObject({ ok: true });

    // Same room+side again: topic is empty (Mirror lag) and the mocked seat claim
    // accepts — the exact restart/second-instance scenario. The vault must not budge.
    const second = await submitCommitmentAction(inputFor("r_vault", "A", "05"));
    expect(second).toMatchObject({ ok: true });

    const stored = await getSealedPayloads("r_vault");
    expect(stored.a?.ciphertext).toBe("04");
  });
});
