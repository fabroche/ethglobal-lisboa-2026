/**
 * Deterministic JSON serialisation for anything written to the HCS topic.
 *
 * The topic is an append-only, independently-readable log (D4/D11); serialising with
 * recursively-sorted object keys means two runs of the same message produce byte-identical
 * bodies, and a third-party verifier re-derives the exact bytes without knowing our field
 * order. Arrays keep their order (order is meaningful); objects are key-sorted; primitives
 * pass through `JSON.stringify`.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

function canonicalise(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalise);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalise((value as Record<string, unknown>)[key]);
  }
  return sorted;
}
