/**
 * M6 · the output vocabulary and the consent gate (D9 as amended).
 *
 * These tests are the leak control's regression net: if the vocabulary ever grows
 * a value that says more than a count, something here should go red.
 */
import { describe, expect, it } from "vitest";

import { GAP_VERDICTS, VERDICTS, applyConsent, bothConsented, isGapVerdict, verdictSchema } from "./verdict";

const BOTH = { a: true, b: true };
const NEITHER = { a: false, b: false };

describe("the verdict vocabulary", () => {
  it("is exactly four values", () => {
    // Pinned deliberately. Adding a value is a privacy decision, so it should
    // require editing a test that says so out loud.
    expect(VERDICTS).toEqual(["workable", "not_workable", "gap:single", "gap:multiple"]);
  });

  it("never names a dimension", () => {
    // D9 as amended: the count may leave the enclave, the dimensions may not.
    for (const verdict of VERDICTS) {
      expect(verdict).not.toMatch(/compensation|timing|scope|price|salary|date/iu);
    }
  });

  it("rejects free text, near-misses and casing variants", () => {
    for (const bad of [
      "The deal is workable",
      "workable.",
      "Workable",
      "gap:compensation", // the pre-amendment vocabulary must not still validate
      "gap",
      "",
      "maybe",
    ]) {
      expect(verdictSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("classifies only the gap values as gaps", () => {
    expect(GAP_VERDICTS.every(isGapVerdict)).toBe(true);
    expect(isGapVerdict("workable")).toBe(false);
    expect(isGapVerdict("not_workable")).toBe(false);
  });
});

describe("bothConsented", () => {
  it("requires both sides, explicitly", () => {
    expect(bothConsented(BOTH)).toBe(true);
    expect(bothConsented({ a: true, b: false })).toBe(false);
    expect(bothConsented({ a: false, b: true })).toBe(false);
    expect(bothConsented(NEITHER)).toBe(false);
  });
});

describe("applyConsent — enforced on the way out, not merely requested", () => {
  it("passes gap verdicts through when both sides opted in", () => {
    expect(applyConsent("gap:single", BOTH)).toBe("gap:single");
    expect(applyConsent("gap:multiple", BOTH)).toBe("gap:multiple");
  });

  it("degrades a gap to not_workable when either side did not opt in", () => {
    // The prompt already withholds the vocabulary, but a prompt is a request.
    // This is a privacy boundary, so it is enforced where compliance is not
    // required — one side declining must be enough.
    for (const consent of [{ a: true, b: false }, { a: false, b: true }, NEITHER]) {
      expect(applyConsent("gap:single", consent)).toBe("not_workable");
      expect(applyConsent("gap:multiple", consent)).toBe("not_workable");
    }
  });

  it("degrades rather than erroring, so one side's choice does not void the room", () => {
    // A withheld gap still leaves a TRUE verdict — gap:* is a refinement of
    // not_workable. Failing the evaluation instead would punish both sides for
    // the fact that one of them declined to share more.
    expect(applyConsent("gap:multiple", NEITHER)).toBe("not_workable");
  });

  it("never upgrades, and never touches the bare verdicts", () => {
    expect(applyConsent("workable", BOTH)).toBe("workable");
    expect(applyConsent("workable", NEITHER)).toBe("workable");
    expect(applyConsent("not_workable", BOTH)).toBe("not_workable");
    expect(applyConsent("not_workable", NEITHER)).toBe("not_workable");
  });

  it("never turns a not_workable into a workable under any consent", () => {
    // The failure that would matter most: consent logic must not be able to
    // flip the answer itself, only its precision.
    for (const consent of [BOTH, NEITHER, { a: true, b: false }]) {
      expect(applyConsent("not_workable", consent)).not.toBe("workable");
      for (const gap of GAP_VERDICTS) {
        expect(applyConsent(gap, consent)).not.toBe("workable");
      }
    }
  });
});
