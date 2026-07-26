import { describe, it, expect } from "vitest";
import { USE_CASES, USE_CASE_IDS, getUseCase, useCaseIdSchema } from "./usecases";

describe("use-case presets (D16)", () => {
  it("covers exactly the three ids of the enum, keyed consistently", () => {
    expect(USE_CASE_IDS).toEqual(["property", "job", "otc"]);
    expect(Object.keys(USE_CASES).sort()).toEqual([...USE_CASE_IDS].sort());
    for (const id of USE_CASE_IDS) {
      expect(USE_CASES[id].id).toBe(id);
    }
  });

  it("every preset is fully filled in (labels, placeholder, checklist, hint)", () => {
    for (const preset of Object.values(USE_CASES)) {
      expect(preset.title).not.toBe("");
      expect(preset.sideLabels.A).not.toBe("");
      expect(preset.sideLabels.B).not.toBe("");
      expect(preset.placeholder).not.toBe("");
      expect(preset.checklist.length).toBeGreaterThanOrEqual(3);
      expect(preset.checklist.every((item) => item.length > 0)).toBe(true);
      expect(preset.evaluatorHint).not.toBe("");
    }
  });

  it("hints name dimensions, never concrete terms (leak control, D9)", () => {
    // A hint with a number would smuggle a term into the enclave prompt.
    for (const preset of Object.values(USE_CASES)) {
      expect(preset.evaluatorHint).not.toMatch(/\d/);
    }
  });

  it("getUseCase returns the preset and rejects unknown ids", () => {
    expect(getUseCase("property").sideLabels).toEqual({ A: "Seller", B: "Buyer" });
    // @ts-expect-error — "poker" is not a use case
    expect(() => getUseCase("poker")).toThrow();
  });

  it("the id schema rejects anything outside the enum", () => {
    expect(useCaseIdSchema.parse("otc")).toBe("otc");
    expect(() => useCaseIdSchema.parse("PROPERTY")).toThrow();
  });
});
