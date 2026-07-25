import { describe, it, expect } from "vitest";
import {
  createRoomInputSchema,
  assertFutureDeadline,
  generateRoomId,
  buildJoinUrl,
} from "./room";

describe("createRoomInputSchema", () => {
  it("applies defaults for useCase and gapOptIn; sideLabels stays unset (preset resolves it, D16)", () => {
    const parsed = createRoomInputSchema.parse({ deadlineIso: "2026-07-26T09:00:00Z" });
    expect(parsed.useCase).toBe("property");
    expect(parsed.sideLabels).toBeUndefined();
    expect(parsed.gapOptIn).toBe(false);
  });

  it("rejects a use case outside the D16 enum", () => {
    expect(() =>
      createRoomInputSchema.parse({ deadlineIso: "2026-07-26T09:00:00Z", useCase: "poker" }),
    ).toThrow();
  });

  it("rejects a non-ISO deadline", () => {
    expect(() => createRoomInputSchema.parse({ deadlineIso: "tomorrow" })).toThrow();
  });
});

describe("assertFutureDeadline", () => {
  const now = new Date("2026-07-26T06:00:00Z");

  it("accepts a deadline in the future", () => {
    expect(() => assertFutureDeadline("2026-07-26T09:00:00Z", now)).not.toThrow();
  });

  it("rejects a deadline in the past", () => {
    expect(() => assertFutureDeadline("2026-07-26T05:59:59Z", now)).toThrow(/future/);
  });

  it("rejects a deadline equal to now", () => {
    expect(() => assertFutureDeadline("2026-07-26T06:00:00Z", now)).toThrow(/future/);
  });

  it("rejects an unparseable date", () => {
    expect(() => assertFutureDeadline("not-a-date", now)).toThrow();
  });
});

describe("generateRoomId", () => {
  it("prefixes the injected id", () => {
    expect(generateRoomId(() => "1234")).toBe("r_1234");
  });
});

describe("buildJoinUrl", () => {
  it("encodes the room id and side, and nothing else", () => {
    const url = buildJoinUrl("https://seam.app", "r_9f3a", "B");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/room/r_9f3a");
    expect(parsed.searchParams.get("side")).toBe("B");
    expect([...parsed.searchParams.keys()]).toEqual(["side"]);
  });

  it("rejects an invalid side", () => {
    // @ts-expect-error — "C" is not a valid side
    expect(() => buildJoinUrl("https://seam.app", "r_9f3a", "C")).toThrow();
  });
});
