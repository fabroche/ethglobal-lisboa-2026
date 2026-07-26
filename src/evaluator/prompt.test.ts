/**
 * M6 · the prompt. The only text that crosses into the enclave, so what it asks
 * for is the ceiling on what can come back.
 */
import { describe, expect, it } from "vitest";

import { USE_CASES } from "../session/usecases";

import { allowedVerdicts, responseFormat, systemPrompt, userPrompt } from "./prompt";

const BOTH = { a: true, b: true };
const NEITHER = { a: false, b: false };

const INPUT = {
  positionA: "I won't sell below €400,000, deed within 90 days.",
  positionB: "I can pay up to €395,000 and need 6 months.",
  useCase: "property" as const,
  consent: NEITHER,
};

describe("allowedVerdicts", () => {
  it("offers the gap values only under two-sided consent", () => {
    expect(allowedVerdicts(BOTH)).toContain("gap:single");
    expect(allowedVerdicts(NEITHER)).not.toContain("gap:single");
    expect(allowedVerdicts(NEITHER)).not.toContain("gap:multiple");
  });

  it("always offers the two bare verdicts", () => {
    for (const consent of [BOTH, NEITHER, { a: true, b: false }]) {
      expect(allowedVerdicts(consent)).toContain("workable");
      expect(allowedVerdicts(consent)).toContain("not_workable");
    }
  });
});

describe("systemPrompt", () => {
  it("carries the use-case hint so the model knows which dimensions matter (D16)", () => {
    const prompt = systemPrompt({ ...INPUT, useCase: "job" });
    expect(prompt).toContain(USE_CASES.job.evaluatorHint);
  });

  it("does not mention the gap vocabulary when consent is missing", () => {
    // Not merely rejected on the way out — never offered. The model is not asked
    // to compute something it must not report.
    const prompt = systemPrompt({ ...INPUT, consent: NEITHER });
    expect(prompt).not.toContain("gap:single");
    expect(prompt).not.toContain("gap:multiple");
  });

  it("explains the counting rule only when the count may be reported", () => {
    const withConsent = systemPrompt({ ...INPUT, consent: BOTH });
    expect(withConsent).toContain("gap:single");
    expect(withConsent).toMatch(/NEVER name a dimension/u);
  });

  it("counts direct contradictions only, and doubt resolves to gap:single (D9.2)", () => {
    // Proven live (26 Jul): a CPCV set as a percentage of an unagreed price, and open
    // date ranges, turned ONE blocker into gap:multiple. gap:single is the "one issue
    // away — worth a phone call" signal; overcounting kills exactly the impulse the
    // product exists to create, so the harm is asymmetric: a false single invites a
    // call that discovers the truth, a false multiple prevents it. The rules are
    // categorical, not procedural — thinking is disabled on this call (D-M6-1), so the
    // model can only pattern-match.
    const withConsent = systemPrompt({ ...INPUT, consent: BOTH });
    expect(withConsent).toMatch(/ONLY direct contradictions between stated limits/u);
    expect(withConsent).toMatch(/contradicts nothing by itself and is NEVER counted/u);
    // The tie-break points at single, never at multiple:
    expect(withConsent).toMatch(/unsure about the rest.*gap:single/su);
    // The worked example is load-bearing for a no-thinking model:
    expect(withConsent).toMatch(/The count is one: gap:single/u);
  });

  it("forbids explanation and reasoning explicitly", () => {
    const prompt = systemPrompt(INPUT);
    expect(prompt).toMatch(/no explanation/iu);
    expect(prompt).toMatch(/no reasoning/iu);
    expect(prompt).toMatch(/EXACTLY ONE/u);
  });

  it("does NOT contain the positions", () => {
    // Positions belong in the user message. A position that reads like an
    // instruction must arrive as data being judged, not as policy being followed.
    const prompt = systemPrompt(INPUT);
    expect(prompt).not.toContain("400,000");
    expect(prompt).not.toContain("395,000");
  });

  it("is deterministic for the same inputs", () => {
    // The 0G signature covers a hash derived from the request (spec-03 §8.1), so
    // a prompt that varied run to run would muddy what the attestation attests to.
    expect(systemPrompt(INPUT)).toBe(systemPrompt(INPUT));
  });
});

describe("userPrompt", () => {
  it("delimits both positions verbatim", () => {
    const prompt = userPrompt(INPUT);
    expect(prompt).toContain("<position_1>");
    expect(prompt).toContain("</position_2>");
    expect(prompt).toContain(INPUT.positionA);
    expect(prompt).toContain(INPUT.positionB);
  });

  it("orders positions canonically by content, NOT by seat (D9.2)", () => {
    // Measured live (26 Jul, temp 0, twice each): the same pair of texts returned
    // gap:single in one seat order and gap:multiple in the other. Which side created
    // the room must not influence the verdict — so seat order must not reach the model.
    const prompt = userPrompt(INPUT);
    const swapped = userPrompt({
      ...INPUT,
      positionA: INPUT.positionB,
      positionB: INPUT.positionA,
    });
    expect(swapped).toBe(prompt);
  });

  it("places the byte-wise smaller position first, deterministically", () => {
    const prompt = userPrompt(INPUT);
    const [first, second] = [INPUT.positionA, INPUT.positionB].sort();
    expect(prompt.indexOf(first!)).toBeLessThan(prompt.indexOf(second!));
  });
});

describe("responseFormat", () => {
  it("constrains the router to the consented enum (belt #1, D11)", () => {
    const schema = responseFormat(NEITHER) as {
      json_schema: { schema: { properties: { verdict: { enum: string[] } } }; strict: boolean };
    };
    expect(schema.json_schema.strict).toBe(true);
    expect(schema.json_schema.schema.properties.verdict.enum).toEqual(["workable", "not_workable"]);
  });

  it("widens to the gap values only under consent", () => {
    const schema = responseFormat(BOTH) as {
      json_schema: { schema: { properties: { verdict: { enum: string[] } } } };
    };
    expect(schema.json_schema.schema.properties.verdict.enum).toHaveLength(4);
  });

  it("forbids extra properties, so no free-text field can ride along", () => {
    const schema = responseFormat(BOTH) as {
      json_schema: { schema: { additionalProperties: boolean } };
    };
    expect(schema.json_schema.schema.additionalProperties).toBe(false);
  });
});
