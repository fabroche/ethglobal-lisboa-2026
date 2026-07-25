/**
 * M6 · the request body sent to the sealed model.
 *
 * Split out of `og-client.ts` and kept free of `server-only` for one reason: the
 * privacy-critical switches live here, and they must be unit-testable. If the only
 * coverage of "is thinking disabled?" were a live script, that assertion would run
 * when someone remembers to run it — and D-M6-1 is not a "when someone remembers"
 * kind of requirement.
 *
 * Pure: no secrets, no network, no wallet.
 */

/** Per-call token ceiling. Tiny by design — the answer is one word (D9). */
export const DEFAULT_MAX_TOKENS = 16;

export interface ChatRequestInput {
  model: string;
  system: string;
  user: string;
  responseFormat: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Build the chat-completions body.
 *
 * Both thinking switches are set. `chat_template_kwargs.enable_thinking` is what
 * this model actually honours; `reasoning_effort` is the documented parameter and
 * both appear in its `supported_parameters`. Setting one and trusting the other to
 * follow would be relying on a default, which is precisely what D-M6-1 forbids —
 * and the cost of setting both is nothing.
 *
 * `temperature` is explicit because the provider default is **1**, not 0.
 */
export function buildChatRequest(input: ChatRequestInput): Record<string, unknown> {
  return {
    model: input.model,
    temperature: 0,
    max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
    chat_template_kwargs: { enable_thinking: false },
    reasoning_effort: "none",
    response_format: input.responseFormat,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
  };
}

/** Shape of a chat completion, before we stop trusting it. */
export interface RawChatCompletion {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null } }>;
}

/**
 * Pull out only the three things we consume.
 *
 * `reasoning_content` is read deliberately, not ignored: we need to know it came
 * back so `evaluate` can refuse the response. Dropping the field here would
 * silently convert a breach into a clean-looking success.
 */
export function readChatCompletion(body: RawChatCompletion): {
  content: string;
  reasoningContent: string | undefined;
  model: string | undefined;
} {
  const message = body.choices?.[0]?.message;
  return {
    content: message?.content ?? "",
    reasoningContent: message?.reasoning_content ?? undefined,
    model: body.model,
  };
}

/**
 * `getServiceMetadata()` returns an endpoint already ending in `/v1/proxy`, while
 * the signature route is built from the BASE url. Append to the endpoint instead
 * and you get `/v1/proxy/v1/proxy/…` and an `"unsupported endpoint"` error that
 * reads like a wrong route rather than a doubled prefix. Cost us a cycle.
 */
export function signatureBaseFrom(endpoint: string): string {
  return endpoint.replace(/\/v1\/proxy\/?$/u, "");
}
