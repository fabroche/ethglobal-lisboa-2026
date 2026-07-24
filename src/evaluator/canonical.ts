/**
 * Canonical serialization — spec-03 §3.
 *
 * A signature is over bytes. Signer and verifier must agree on exactly one
 * payload -> bytes function, stable across runs, machines and key insertion
 * order. This is one of the two hard parts named in CLAUDE.md.
 *
 * JCS (RFC 8785) in spirit, restricted to the subset Seam actually uses, and
 * written by hand so it stays auditable in one screen with no dependency.
 *
 * Rules:
 *   1. Object keys sorted lexicographically (UTF-16 code unit), recursively.
 *   2. Compact JSON — no insignificant whitespace.
 *   3. UTF-8 bytes, strings NFC-normalized.
 *   4. Array order preserved (order is meaning).
 *   5. `undefined` / functions dropped from objects; `null` preserved.
 *   6. Integers only — no floats (their formatting is not portable).
 *   7. No timestamp/nonce/ambient value may appear in the signed bytes.
 *      Rule 7 is a discipline on callers, not something this file can enforce.
 */

/** Thrown when a payload cannot be canonicalized. Callers turn this into a
 *  `not_canonical` failure — never into an exception that escapes. */
export class NotCanonicalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotCanonicalError";
  }
}

/** JSON escaping per RFC 8785 §3.2.2.2 — the shortest form, lowercase \uXXXX. */
function encodeString(value: string): string {
  // NFC first: "é" as one code point and as e+combining-accent are the same
  // string to a human and must be the same bytes to a verifier.
  const normalized = value.normalize("NFC");
  let out = '"';
  for (const char of normalized) {
    const code = char.codePointAt(0)!;
    switch (char) {
      case '"':
        out += '\\"';
        break;
      case "\\":
        out += "\\\\";
        break;
      case "\b":
        out += "\\b";
        break;
      case "\f":
        out += "\\f";
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      default:
        if (code < 0x20) {
          out += `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          out += char;
        }
    }
  }
  return out + '"';
}

function encodeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new NotCanonicalError(`non-finite number: ${value}`);
  }
  if (!Number.isInteger(value)) {
    // Rule 6. A float in signed bytes is a portability bug waiting for the
    // one machine that formats it differently. We never need one.
    throw new NotCanonicalError(`floats are not canonical: ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new NotCanonicalError(`integer outside safe range: ${value}`);
  }
  // -0 and 0 are the same value; only one spelling may reach the bytes.
  return Object.is(value, -0) ? "0" : String(value);
}

/** `true` for values that are dropped from objects and become `null` in arrays. */
function isDropped(value: unknown): boolean {
  return value === undefined || typeof value === "function" || typeof value === "symbol";
}

function encodeValue(value: unknown, seen: WeakSet<object>, path: string): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return encodeNumber(value);
    case "bigint":
      // Deliberate: bigint has an unambiguous decimal form, unlike a float.
      return value.toString();
    case "string":
      return encodeString(value);
    case "undefined":
    case "function":
    case "symbol":
      throw new NotCanonicalError(`value of type ${typeof value} at ${path}`);
  }

  if (typeof value !== "object") {
    throw new NotCanonicalError(`unsupported type ${typeof value} at ${path}`);
  }

  const obj = value as object;
  if (seen.has(obj)) {
    throw new NotCanonicalError(`circular reference at ${path}`);
  }
  seen.add(obj);

  try {
    if (Array.isArray(obj)) {
      // Rule 4: order preserved. A hole or `undefined` becomes `null`, which is
      // what JSON.stringify does and keeps indices meaningful.
      const items = obj.map((item, index) =>
        isDropped(item) ? "null" : encodeValue(item, seen, `${path}[${index}]`),
      );
      return `[${items.join(",")}]`;
    }

    if (obj instanceof Date || obj instanceof Map || obj instanceof Set || ArrayBuffer.isView(obj)) {
      // No implicit coercion. A Date in a signed payload is almost always the
      // rule-7 mistake (an ambient timestamp); make the caller be explicit.
      throw new NotCanonicalError(`unsupported object ${obj.constructor.name} at ${path}`);
    }

    // Rule 1 + 5: own enumerable string keys, undefined-valued keys dropped,
    // then sorted by UTF-16 code unit — which is what Array#sort does natively.
    const entries = Object.entries(obj as Record<string, unknown>)
      .filter(([, v]) => !isDropped(v))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    const parts = entries.map(
      ([key, v]) => `${encodeString(key)}:${encodeValue(v, seen, `${path}.${key}`)}`,
    );
    return `{${parts.join(",")}}`;
  } finally {
    // Sibling references to the same object are fine; only cycles are not.
    seen.delete(obj);
  }
}

/** Canonical JSON text for `payload`. Throws {@link NotCanonicalError}. */
export function canonicalize(payload: unknown): string {
  return encodeValue(payload, new WeakSet<object>(), "$");
}

/** Canonical UTF-8 bytes — what actually gets hashed and signed. */
export function canonicalBytes(payload: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalize(payload));
}
