/**
 * M6 · `evaluate`. Every test here runs against a fake model — no 0G, no network,
 * no spend. The real adapter is covered by `npm run spike`, live.
 */
import { describe, expect, it, vi } from "vitest";

import {
  evaluate,
  parseVerdict,
  servesPinnedModel,
  type SealedModel,
  type SealedModelResponse,
} from "./evaluate";

const BOTH = { a: true, b: true };
const NEITHER = { a: false, b: false };

const INPUT = {
  positionA: "I won't sell below €400,000, deed within 90 days.",
  positionB: "I can pay up to €395,000 and need 6 months.",
  useCase: "property" as const,
  consent: NEITHER,
};

/** A model that answers with whatever we hand it. */
function fakeModel(response: Partial<SealedModelResponse> & { content: string }): SealedModel {
  return { complete: async () => ({ ...response }) };
}

describe("parseVerdict", () => {
  it("reads the JSON shape response_format produces", () => {
    expect(parseVerdict('{"verdict":"workable"}')).toBe("workable");
    expect(parseVerdict('  {"verdict": "gap:single"}  ')).toBe("gap:single");
  });

  it("reads a bare token, since providers vary in wrapping", () => {
    expect(parseVerdict("not_workable")).toBe("not_workable");
    expect(parseVerdict("  workable\n")).toBe("workable");
  });

  it("refuses to mine a verdict out of prose", () => {
    // Recovering "workable" from a sentence would make the enum guarantee true in
    // the types and false in reality — a compliance failure must surface as one.
    expect(parseVerdict("I think this is workable because the price gap is small")).toBeNull();
    expect(parseVerdict("Verdict: workable")).toBeNull();
    expect(parseVerdict("workable.")).toBeNull();
  });

  it("rejects malformed JSON, wrong keys and the pre-amendment vocabulary", () => {
    expect(parseVerdict("{oops")).toBeNull();
    expect(parseVerdict('{"answer":"workable"}')).toBeNull();
    expect(parseVerdict('{"verdict":"gap:compensation"}')).toBeNull();
    expect(parseVerdict("")).toBeNull();
  });
});

describe("evaluate · the happy path", () => {
  it("returns the verdict the model gave", async () => {
    const result = await evaluate(INPUT, { model: fakeModel({ content: '{"verdict":"not_workable"}' }) });
    expect(result).toMatchObject({ ok: true, verdict: "not_workable", gapWithheld: false });
  });

  it("passes a gap through when both sides opted in", async () => {
    const result = await evaluate(
      { ...INPUT, consent: BOTH },
      { model: fakeModel({ content: '{"verdict":"gap:single"}' }) },
    );
    expect(result).toMatchObject({ ok: true, verdict: "gap:single", gapWithheld: false });
  });

  it("sends the pinned model a constrained schema and separated messages", async () => {
    const complete = vi.fn<SealedModel["complete"]>().mockResolvedValue({ content: "workable" });
    await evaluate({ ...INPUT, consent: BOTH }, { model: { complete } });

    const request = complete.mock.calls[0]![0];
    expect(request.system).toMatch(/EXACTLY ONE/u);
    expect(request.user).toContain("<position_1>");
    // Positions must not leak into the system message.
    expect(request.system).not.toContain("400,000");
    expect(request.responseFormat).toMatchObject({ type: "json_schema" });
  });
});

describe("evaluate · consent is enforced, not requested", () => {
  it("degrades an unconsented gap and says so", async () => {
    // The model was not offered the gap vocabulary and answered with it anyway —
    // exactly the non-compliance the outbound gate exists for.
    const result = await evaluate(
      { ...INPUT, consent: NEITHER },
      { model: fakeModel({ content: '{"verdict":"gap:multiple"}' }) },
    );

    expect(result).toMatchObject({ ok: true, verdict: "not_workable", gapWithheld: true });
  });

  it("degrades when only one side opted in", async () => {
    const result = await evaluate(
      { ...INPUT, consent: { a: true, b: false } },
      { model: fakeModel({ content: "gap:single" }) },
    );
    expect(result).toMatchObject({ ok: true, verdict: "not_workable", gapWithheld: true });
  });
});

describe("evaluate · fail closed (D-M6-1 and friends)", () => {
  it("rejects a response carrying reasoning, even when the verdict is correct", async () => {
    // The privacy hole. A chain of thought discusses BOTH positions, so receiving
    // it is already the breach — a correct verdict alongside it is still a failure.
    const result = await evaluate(INPUT, {
      model: fakeModel({
        content: '{"verdict":"workable"}',
        reasoningContent: "Side A wants 400k and side B offers 395k, so the gap is 5k…",
      }),
    });

    expect(result).toMatchObject({ ok: false, reason: "reasoning_returned" });
  });

  it("tolerates an empty or absent reasoning field", async () => {
    for (const reasoningContent of [undefined, "", "   "]) {
      const result = await evaluate(INPUT, {
        model: fakeModel({ content: "workable", reasoningContent }),
      });
      expect(result.ok).toBe(true);
    }
  });

  it("rejects off-enum output without echoing the model's prose", async () => {
    const leak = "Side A demands €400,000 while B caps at €395,000, so no deal exists.";
    const result = await evaluate(INPUT, { model: fakeModel({ content: leak }) });

    expect(result).toMatchObject({ ok: false, reason: "off_enum_output" });
    // The detail is capped: on a compliance failure the content IS derived from
    // both positions, and a log is the last place it should end up.
    if (!result.ok) {
      expect(result.detail!.length).toBeLessThan(50);
      expect(result.detail).not.toContain("395,000");
    }
  });

  it("rejects a response served by a model we did not pin", async () => {
    const result = await evaluate(INPUT, {
      model: fakeModel({ content: "workable", model: "some-other-model" }),
      pinnedModel: "0gm-1.0-35b-a3b",
    });
    expect(result).toMatchObject({ ok: false, reason: "model_mismatch" });
  });

  it("records the exact served snapshot with the verdict (RF-M6-005)", async () => {
    const result = await evaluate(INPUT, {
      model: fakeModel({ content: "workable", model: "0GM-1.0-35B-A3B-0427" }),
      pinnedModel: "0gm-1.0-35b-a3b",
    });
    // The pin is the family; the exact snapshot is what gets published.
    expect(result).toMatchObject({ ok: true, model: "0GM-1.0-35B-A3B-0427" });
  });
});

describe("servesPinnedModel · found the hard way, live", () => {
  it("accepts the snapshot suffix the provider actually serves", () => {
    // 25 Jul: the catalog advertises `0gm-1.0-35b-a3b`, the provider serves
    // `0GM-1.0-35B-A3B-0427`. Exact equality rejected the model we pinned, and
    // no amount of mocking would have surfaced that — only a live call did.
    expect(servesPinnedModel("0GM-1.0-35B-A3B-0427", "0gm-1.0-35b-a3b")).toBe(true);
  });

  it("accepts a case difference, since getServiceMetadata upper-cases", () => {
    expect(servesPinnedModel("0GM-1.0-35B-A3B", "0gm-1.0-35b-a3b")).toBe(true);
  });

  it("still rejects the sibling variant, which is a different provider", () => {
    // `-sia` has its own provider and therefore its own signing key — accepting
    // it would silently break the pinned-signer guarantee.
    expect(servesPinnedModel("0gm-1.0-35b-a3b", "0gm-1.0-35b-a3b-sia")).toBe(false);
    expect(servesPinnedModel("glm-5.2", "0gm-1.0-35b-a3b")).toBe(false);
  });

  it("is not a substring match — the pin must be the PREFIX", () => {
    // "anything-0gm-1.0-35b-a3b" must not pass as our model.
    expect(servesPinnedModel("evil-0gm-1.0-35b-a3b", "0gm-1.0-35b-a3b")).toBe(false);
  });

  it("turns a thrown model error into a typed failure, never an exception", async () => {
    const result = await evaluate(INPUT, {
      model: { complete: async () => Promise.reject(new Error("enclave unreachable")) },
    });
    expect(result).toMatchObject({ ok: false, reason: "model_error" });
  });

  it("refuses to judge an empty position instead of inventing one", async () => {
    const complete = vi.fn<SealedModel["complete"]>();
    for (const bad of [
      { ...INPUT, positionA: "" },
      { ...INPUT, positionB: "   " },
    ]) {
      expect(await evaluate(bad, { model: { complete } })).toMatchObject({
        ok: false,
        reason: "empty_position",
      });
    }
    // And it does not spend a call finding out.
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects an unknown use case", async () => {
    const result = await evaluate(
      { ...INPUT, useCase: "divorce" as never },
      { model: fakeModel({ content: "workable" }) },
    );
    expect(result).toMatchObject({ ok: false, reason: "unknown_use_case" });
  });

  it("never returns a verdict on any failure path", async () => {
    // The invariant the publish path depends on: no failure carries a verdict a
    // caller could reach for by accident.
    const failures = [
      await evaluate(INPUT, { model: fakeModel({ content: "prose prose prose" }) }),
      await evaluate(INPUT, { model: fakeModel({ content: "workable", reasoningContent: "…" }) }),
      await evaluate({ ...INPUT, positionA: "" }, { model: fakeModel({ content: "workable" }) }),
    ];

    for (const result of failures) {
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty("verdict");
    }
  });
});
