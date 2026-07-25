/**
 * M6 · the request body. These assertions ARE D-M6-1: if any of them goes red,
 * the enclave is free to send us prose derived from both positions.
 */
import { describe, expect, it } from "vitest";

import { buildChatRequest, readChatCompletion, signatureBaseFrom } from "./og-request";

const INPUT = {
  model: "0gm-1.0-35b-a3b",
  system: "answer with one word",
  user: "<position_a>…</position_a>",
  responseFormat: { type: "json_schema" as const },
};

describe("buildChatRequest · the privacy switches (D-M6-1)", () => {
  it("disables thinking through BOTH available switches", () => {
    // Not redundancy for its own sake: chat_template_kwargs is what this model
    // honours, reasoning_effort is the documented parameter. Setting one and
    // trusting the other to follow would be relying on a default.
    const body = buildChatRequest(INPUT) as {
      chat_template_kwargs: { enable_thinking: boolean };
      reasoning_effort: string;
    };

    expect(body.chat_template_kwargs.enable_thinking).toBe(false);
    expect(body.reasoning_effort).toBe("none");
  });

  it("sets temperature to 0 explicitly, because the provider default is 1", () => {
    const body = buildChatRequest(INPUT) as { temperature: number };
    expect(body.temperature).toBe(0);
    // Present, not merely falsy — an absent field would inherit the default.
    expect(Object.keys(buildChatRequest(INPUT))).toContain("temperature");
  });

  it("caps max_tokens tightly, since the answer is one word", () => {
    const body = buildChatRequest(INPUT) as { max_tokens: number };
    expect(body.max_tokens).toBeLessThanOrEqual(16);
  });

  it("passes the constrained response_format through (belt #1, D11)", () => {
    const body = buildChatRequest(INPUT) as { response_format: unknown };
    expect(body.response_format).toBe(INPUT.responseFormat);
  });

  it("keeps system and user messages separate and in order", () => {
    const body = buildChatRequest(INPUT) as { messages: Array<{ role: string; content: string }> };
    expect(body.messages).toEqual([
      { role: "system", content: INPUT.system },
      { role: "user", content: INPUT.user },
    ]);
  });

  it("sends the model it was given, never a default", () => {
    const body = buildChatRequest({ ...INPUT, model: "other" }) as { model: string };
    expect(body.model).toBe("other");
  });
});

describe("readChatCompletion", () => {
  it("surfaces reasoning_content rather than dropping it", () => {
    // Dropping the field would silently turn a breach into a clean success.
    const read = readChatCompletion({
      choices: [{ message: { content: "workable", reasoning_content: "A wants 400k…" } }],
    });
    expect(read.reasoningContent).toBe("A wants 400k…");
  });

  it("normalises absent and null reasoning to undefined", () => {
    expect(readChatCompletion({ choices: [{ message: { content: "workable" } }] }).reasoningContent).toBeUndefined();
    expect(
      readChatCompletion({ choices: [{ message: { content: "x", reasoning_content: null } }] }).reasoningContent,
    ).toBeUndefined();
  });

  it("turns a null or missing content into an empty string, not a crash", () => {
    // Seen live: with max_tokens spent on reasoning, content came back null.
    expect(readChatCompletion({ choices: [{ message: { content: null } }] }).content).toBe("");
    expect(readChatCompletion({}).content).toBe("");
    expect(readChatCompletion({ choices: [] }).content).toBe("");
  });

  it("echoes the model back so the pin can be checked", () => {
    expect(readChatCompletion({ model: "0GM-1.0-35B-A3B" }).model).toBe("0GM-1.0-35B-A3B");
  });
});

describe("signatureBaseFrom", () => {
  it("strips the /v1/proxy suffix getServiceMetadata returns", () => {
    expect(signatureBaseFrom("https://broker.example/v1/proxy")).toBe("https://broker.example");
    expect(signatureBaseFrom("https://broker.example/v1/proxy/")).toBe("https://broker.example");
  });

  it("leaves a base url untouched, so it is safe to apply twice", () => {
    expect(signatureBaseFrom("https://broker.example")).toBe("https://broker.example");
  });
});
