/** Canonical serialization — spec-03 §3. The determinism obligation. */
import { describe, expect, it } from "vitest";

import { canonicalize, canonicalBytes, NotCanonicalError } from "./canonical";

describe("canonicalize", () => {
  it("is independent of key insertion order (the determinism obligation)", () => {
    const a = { verdict: "workable", sessionId: "s1", model: "m" };
    const b = { model: "m", sessionId: "s1", verdict: "workable" };
    const c = { sessionId: "s1", model: "m", verdict: "workable" };

    expect(canonicalize(a)).toBe(canonicalize(b));
    expect(canonicalize(b)).toBe(canonicalize(c));
    expect(canonicalize(a)).toBe('{"model":"m","sessionId":"s1","verdict":"workable"}');
  });

  it("sorts nested keys recursively", () => {
    expect(canonicalize({ z: { b: 1, a: 2 }, a: 3 })).toBe('{"a":3,"z":{"a":2,"b":1}}');
  });

  it("preserves array order — order is meaning", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalize(["b", "a"])).not.toBe(canonicalize(["a", "b"]));
  });

  it("drops undefined-valued keys but keeps null", () => {
    expect(canonicalize({ a: undefined, b: null, c: 1 })).toBe('{"b":null,"c":1}');
  });

  it("treats an absent key and an undefined key as the same bytes", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }));
  });

  it("emits no insignificant whitespace", () => {
    expect(canonicalize({ a: [1, { b: 2 }] })).toBe('{"a":[1,{"b":2}]}');
  });

  it("normalizes strings to NFC so equal text is equal bytes", () => {
    const composed = "café"; // é as one code point
    const decomposed = "café"; // e + combining acute
    expect(composed).not.toBe(decomposed);
    expect(canonicalize({ v: composed })).toBe(canonicalize({ v: decomposed }));
  });

  it("escapes quotes, backslashes, newlines and control characters", () => {
    const input = `a"b\\c\nd${String.fromCharCode(1)}`;
    const expected = `{"v":"a\\"b\\\\c\\nd\\u0001"}`;
    expect(canonicalize({ v: input })).toBe(expected);
  });

  it("rejects floats — their formatting is not portable", () => {
    expect(() => canonicalize({ v: 1.5 })).toThrow(NotCanonicalError);
  });

  it("rejects NaN, Infinity and unsafe integers", () => {
    expect(() => canonicalize({ v: Number.NaN })).toThrow(NotCanonicalError);
    expect(() => canonicalize({ v: Number.POSITIVE_INFINITY })).toThrow(NotCanonicalError);
    expect(() => canonicalize({ v: Number.MAX_SAFE_INTEGER + 2 })).toThrow(NotCanonicalError);
  });

  it("collapses -0 to 0 so one value has one spelling", () => {
    expect(canonicalize({ v: -0 })).toBe('{"v":0}');
  });

  it("rejects Date — an ambient timestamp in signed bytes is the rule-7 mistake", () => {
    expect(() => canonicalize({ at: new Date(0) })).toThrow(NotCanonicalError);
  });

  it("rejects Map, Set and typed arrays rather than coercing them", () => {
    expect(() => canonicalize({ v: new Map() })).toThrow(NotCanonicalError);
    expect(() => canonicalize({ v: new Set() })).toThrow(NotCanonicalError);
    expect(() => canonicalize({ v: new Uint8Array([1]) })).toThrow(NotCanonicalError);
  });

  it("rejects circular references but allows repeated siblings", () => {
    const cycle: Record<string, unknown> = { a: 1 };
    cycle.self = cycle;
    expect(() => canonicalize(cycle)).toThrow(NotCanonicalError);

    const shared = { x: 1 };
    expect(canonicalize({ a: shared, b: shared })).toBe('{"a":{"x":1},"b":{"x":1}}');
  });

  it("serializes bigint, which has an unambiguous decimal form", () => {
    expect(canonicalize({ v: 10n ** 20n })).toBe('{"v":100000000000000000000}');
  });

  it("produces UTF-8 bytes", () => {
    expect(canonicalBytes({ v: "é" })).toEqual(new TextEncoder().encode('{"v":"é"}'));
  });
});
