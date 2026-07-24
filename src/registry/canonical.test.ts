import { describe, it, expect } from "vitest";
import { canonicalJson } from "./canonical";

describe("canonicalJson", () => {
  it("is independent of object key order", () => {
    const a = canonicalJson({ b: 1, a: 2, c: 3 });
    const b = canonicalJson({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it("sorts keys recursively in nested objects", () => {
    expect(canonicalJson({ z: { y: 1, x: 2 }, a: 3 })).toBe('{"a":3,"z":{"x":2,"y":1}}');
  });

  it("preserves array order (order is meaningful)", () => {
    expect(canonicalJson({ items: ["b", "a", "c"] })).toBe('{"items":["b","a","c"]}');
  });

  it("passes primitives through", () => {
    expect(canonicalJson("x")).toBe('"x"');
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(true)).toBe("true");
  });

  it("round-trips back to an equal value", () => {
    const value = { v: 1, type: "expiry", roomId: "r_9f3a" };
    expect(JSON.parse(canonicalJson(value))).toEqual(value);
  });
});
