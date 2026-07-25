import { describe, it, expect, vi } from "vitest";

import { buildCommitmentMessage, type CommitmentMessage } from "@/session";
import type { SealedPayload } from "@/seal";
import type { Envelope } from "@/evaluator/attest";
import { generateEnclaveKey, signEnvelope } from "@/evaluator/attest-testkit";

import { runReveal, type RunRevealDeps, type RevealTopicView } from "./run-reveal";

/** The shape `runReveal` hands the evaluator — spelled out so the spies keep their types. */
type EvaluateArgs = Parameters<RunRevealDeps["evaluate"]>[0];

const NOW = "2026-07-26T05:00:00.000Z";

function commitment(side: "A" | "B", gapOptIn = false): CommitmentMessage {
  return buildCommitmentMessage({
    roomId: "r_1",
    side,
    commitment: `${"ab".repeat(32)}`,
    worldNullifier: `nullifier-${side}`,
    gapOptIn,
    submittedAt: "2026-07-26T04:00:00.000Z",
  });
}

const payload = (label: string): SealedPayload => ({
  v: 1,
  suite: "x25519-hkdf-sha256-aes256gcm",
  epk: "aa".repeat(32),
  ciphertext: `cipher-${label}`,
});

const key = generateEnclaveKey("secp256k1-eth");

/** A genuinely signed envelope, so "verified" is proven rather than stubbed. */
function realEnvelope(payloadValue: unknown): Envelope {
  return signEnvelope(payloadValue, key, { attestationRef: "https://broker.example/v1/proxy/signature/chat-1" });
}

function deps(over: Partial<RunRevealDeps> = {}): RunRevealDeps {
  const view: RevealTopicView = {
    commitments: [commitment("A"), commitment("B")],
    useCase: "property",
    hasExpiry: true,
    hasVerdict: false,
  };
  return {
    readRoom: async () => view,
    sealedPayloads: async () => ({ a: payload("a"), b: payload("b") }),
    unseal: async (p) => `plaintext for ${p.ciphertext}`,
    evaluate: async () => ({ ok: true, verdict: "workable", gapWithheld: false, model: "0GM-1.0-35B-A3B-0427" }),
    attestation: async () => ({ ok: true, envelope: realEnvelope({ verdict: "workable" }) }),
    pinnedKey: key.pinned,
    publishVerdict: async () => ({ sequenceNumber: 7 }),
    ...over,
  };
}

describe("runReveal — the happy path that did not exist before S2.9", () => {
  it("publishes a verdict message carrying the attestation reference", async () => {
    const result = await runReveal({ roomId: "r_1", now: NOW }, deps());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message.type).toBe("verdict");
    expect(result.message.verdict).toBe("workable");
    expect(result.message.publishedAt).toBe(NOW);
    expect(result.message.attestationRef.length).toBeGreaterThan(0);
    expect(result.sequenceNumber).toBe(7);
  });

  it("records the EXACT model the provider served, not the family we pinned", async () => {
    // The catalog advertises `0gm-1.0-35b-a3b`; the provider serves a dated snapshot.
    // The verdict must carry the snapshot (RF-M6-005) or the record is weaker than the claim.
    const result = await runReveal({ roomId: "r_1", now: NOW }, deps());
    expect(result.ok && result.message.modelHash).toBe("0GM-1.0-35B-A3B-0427");
  });

  it("feeds the enclave the two unsealed positions", async () => {
    const evaluate = vi.fn(async () => ({
      ok: true as const,
      verdict: "not_workable" as const,
      gapWithheld: false,
      model: "m",
    }));
    await runReveal({ roomId: "r_1", now: NOW }, deps({ evaluate }));

    expect(evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        positionA: "plaintext for cipher-a",
        positionB: "plaintext for cipher-b",
        useCase: "property",
      }),
    );
  });
});

describe("runReveal — consent comes from the topic, never from a form (S2.8)", () => {
  it("passes no consent when neither commitment opted in", async () => {
    const evaluate = vi.fn(async (_input: EvaluateArgs) => ({ ok: true as const, verdict: "workable" as const, gapWithheld: false, model: "m" }));
    await runReveal({ roomId: "r_1", now: NOW }, deps({ evaluate }));
    expect(evaluate.mock.calls[0]?.[0]).toMatchObject({ consent: { a: false, b: false } });
  });

  it("passes two-sided consent only when BOTH commitments carry it", async () => {
    const evaluate = vi.fn(async (_input: EvaluateArgs) => ({ ok: true as const, verdict: "gap:single" as const, gapWithheld: false, model: "m" }));
    const view: RevealTopicView = {
      commitments: [commitment("A", true), commitment("B", true)],
      useCase: "property",
      hasExpiry: true,
      hasVerdict: false,
    };
    await runReveal({ roomId: "r_1", now: NOW }, deps({ evaluate, readRoom: async () => view }));
    expect(evaluate.mock.calls[0]?.[0]).toMatchObject({ consent: { a: true, b: true } });
  });

  it("one side's consent is not enough — B never agreed", async () => {
    const evaluate = vi.fn(async (_input: EvaluateArgs) => ({ ok: true as const, verdict: "workable" as const, gapWithheld: false, model: "m" }));
    const view: RevealTopicView = {
      commitments: [commitment("A", true), commitment("B", false)],
      useCase: "property",
      hasExpiry: true,
      hasVerdict: false,
    };
    await runReveal({ roomId: "r_1", now: NOW }, deps({ evaluate, readRoom: async () => view }));
    expect(evaluate.mock.calls[0]?.[0]).toMatchObject({ consent: { a: true, b: false } });
  });
});

describe("runReveal — FAIL CLOSED (D10)", () => {
  it("publishes NOTHING when the attestation cannot be fetched", async () => {
    const publishVerdict = vi.fn(async () => ({ sequenceNumber: 1 }));
    const result = await runReveal(
      { roomId: "r_1", now: NOW },
      deps({ publishVerdict, attestation: async () => ({ ok: false, detail: "chat_id_not_found" }) }),
    );

    expect(result).toMatchObject({ ok: false, reason: "attestation_unavailable" });
    expect(publishVerdict).not.toHaveBeenCalled();
  });

  it("publishes NOTHING when the signature does not verify against the pinned key", async () => {
    // The loud failure: a signature arrived and is not ours. Signed with a DIFFERENT
    // key — this is what a swapped enclave, or a wrongly pinned key, looks like.
    const impostor = generateEnclaveKey("secp256k1-eth");
    const publishVerdict = vi.fn(async () => ({ sequenceNumber: 1 }));
    const result = await runReveal(
      { roomId: "r_1", now: NOW },
      deps({
        publishVerdict,
        attestation: async () => ({ ok: true, envelope: signEnvelope({ verdict: "workable" }, impostor) }),
      }),
    );

    expect(result).toMatchObject({ ok: false, reason: "attestation_invalid" });
    expect(publishVerdict).not.toHaveBeenCalled();
  });

  it("publishes NOTHING when the evaluation itself failed", async () => {
    const publishVerdict = vi.fn(async () => ({ sequenceNumber: 1 }));
    const result = await runReveal(
      { roomId: "r_1", now: NOW },
      deps({ publishVerdict, evaluate: async () => ({ ok: false, reason: "reasoning_returned", detail: "724 chars" }) }),
    );

    expect(result).toMatchObject({ ok: false, reason: "evaluation_failed" });
    expect(result.ok === false && result.detail).toContain("reasoning_returned");
    expect(publishVerdict).not.toHaveBeenCalled();
  });

  it("never verifies the attestation before it has something to attest", async () => {
    // Ordering matters: fetching a signature for a call that failed would attest to
    // nothing, and a passing check there would read as safety.
    const attestation = vi.fn(async () => ({ ok: true as const, envelope: realEnvelope({}) }));
    await runReveal(
      { roomId: "r_1", now: NOW },
      deps({ attestation, evaluate: async () => ({ ok: false, reason: "model_error" }) }),
    );
    expect(attestation).not.toHaveBeenCalled();
  });
});

describe("runReveal — refuses to judge an incomplete room", () => {
  it("stops when only one side committed", async () => {
    const evaluate = vi.fn();
    const view: RevealTopicView = {
      commitments: [commitment("A")],
      useCase: "property",
      hasExpiry: true,
      hasVerdict: false,
    };
    const result = await runReveal({ roomId: "r_1", now: NOW }, deps({ evaluate, readRoom: async () => view }));

    // Judging one position means inventing the other and answering about it.
    expect(result).toMatchObject({ ok: false, reason: "incomplete_commitments" });
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("stops when the room never published an expiry", async () => {
    const view: RevealTopicView = { commitments: [commitment("A"), commitment("B")], hasExpiry: false, hasVerdict: false };
    const result = await runReveal({ roomId: "r_1", now: NOW }, deps({ readRoom: async () => view }));
    expect(result).toMatchObject({ ok: false, reason: "no_expiry" });
  });

  it("stops when a verdict is already on the topic — a second reveal must not append", async () => {
    const publishVerdict = vi.fn(async () => ({ sequenceNumber: 1 }));
    const view: RevealTopicView = {
      commitments: [commitment("A"), commitment("B")],
      hasExpiry: true,
      hasVerdict: true,
    };
    const result = await runReveal({ roomId: "r_1", now: NOW }, deps({ publishVerdict, readRoom: async () => view }));

    expect(result).toMatchObject({ ok: false, reason: "already_published" });
    expect(publishVerdict).not.toHaveBeenCalled();
  });

  it("stops when the ciphertext is gone even though the commitment is on the topic", async () => {
    // The store is per-process (D4, no DB): a restart between commit and reveal lands here.
    const result = await runReveal(
      { roomId: "r_1", now: NOW },
      deps({ sealedPayloads: async () => ({ a: payload("a") }) }),
    );
    expect(result).toMatchObject({ ok: false, reason: "missing_sealed_payload" });
  });
});

describe("runReveal — leaks nothing on the failure paths", () => {
  it("an unseal failure reports the error TYPE, never the plaintext fragments", async () => {
    const result = await runReveal(
      { roomId: "r_1", now: NOW },
      deps({
        unseal: async () => {
          throw new Error("OperationError: decryption failed on 'my price is 450k'");
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, reason: "unseal_failed" });
    expect(result.ok === false && result.detail).toBe("Error");
    expect(JSON.stringify(result)).not.toContain("450k");
  });

  it("surfaces a publish failure instead of reporting success", async () => {
    const result = await runReveal(
      { roomId: "r_1", now: NOW },
      deps({
        publishVerdict: async () => {
          throw new Error("topic unavailable");
        },
      }),
    );
    expect(result).toMatchObject({ ok: false, reason: "publish_failed" });
  });
});

describe("runReveal — legacy rooms", () => {
  it("defaults the use case rather than guessing when a room predates D16", async () => {
    const evaluate = vi.fn(async (_input: EvaluateArgs) => ({ ok: true as const, verdict: "workable" as const, gapWithheld: false, model: "m" }));
    const view: RevealTopicView = {
      commitments: [commitment("A"), commitment("B")],
      hasExpiry: true,
      hasVerdict: false,
    };
    await runReveal({ roomId: "r_1", now: NOW }, deps({ evaluate, readRoom: async () => view }));
    expect(evaluate.mock.calls[0]?.[0]).toMatchObject({ useCase: "property" });
  });
});
