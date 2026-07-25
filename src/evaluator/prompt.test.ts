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
    // Entangled positions must fall to gap:multiple rather than a fabricated pick.
    expect(withConsent).toMatch(/cannot cleanly attribute.*gap:multiple/su);
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
  it("delimits and labels both positions verbatim", () => {
    const prompt = userPrompt(INPUT);
    expect(prompt).toContain("<position_a>");
    expect(prompt).toContain("</position_b>");
    expect(prompt).toContain(INPUT.positionA);
    expect(prompt).toContain(INPUT.positionB);
  });

  it("keeps A before B, so side labels cannot silently swap", () => {
    const prompt = userPrompt(INPUT);
    expect(prompt.indexOf("<position_a>")).toBeLessThan(prompt.indexOf("<position_b>"));
    expect(prompt.indexOf(INPUT.positionA)).toBeLessThan(prompt.indexOf(INPUT.positionB));
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
