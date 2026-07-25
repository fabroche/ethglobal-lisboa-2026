import { z } from "zod";

/**
 * Use-case guidance presets (D16). Single source of truth consumed by:
 *  - M8 create screen — the 3-card picker (title/tagline/side labels),
 *  - M8 write+seal screen (S3.2) — placeholder + soft checklist (never blocks sealing, DA8),
 *  - M6 evaluator — `evaluatorHint`, prepended to the enclave prompt (RF-M6-007).
 *
 * Presets are guidance only: positions stay free-form plain language in one sealed blob.
 * The preset id (`useCase`) is public metadata on the expiry message — it names the deal
 * *type*, never the terms. Hints name dimensions, never terms (leak control, D9).
 */

export const useCaseIdSchema = z.enum(["property", "job", "otc"]);
export type UseCaseId = z.infer<typeof useCaseIdSchema>;

export interface UseCasePreset {
  id: UseCaseId;
  /** Card title on the create screen's picker. */
  title: string;
  /** One-line card subtitle. */
  tagline: string;
  /** Default side labels; `createRoom` input may override them. A = opener. */
  sideLabels: { A: string; B: string };
  /** Example position — the write screen's placeholder (S3.2). */
  placeholder: string;
  /** Soft guidance shown next to the position field. Never a validation rule. */
  checklist: string[];
  /** Prepended to the enclave prompt so the model knows which dimensions matter. */
  evaluatorHint: string;
}

export const USE_CASES: Record<UseCaseId, UseCasePreset> = {
  property: {
    id: "property",
    title: "Property sale",
    tagline: "Buyer and seller test the deal before showing numbers.",
    sideLabels: { A: "Seller", B: "Buyer" },
    placeholder:
      "e.g. I won't sell below €400,000. At least 10% at CPCV, signed by 30 August; deed within 90 days of the CPCV.",
    checklist: [
      "Price",
      "Amount at CPCV (% or €)",
      "CPCV date",
      "CPCV → deed duration (the deed date follows)",
    ],
    evaluatorHint:
      "This is a property sale negotiation. Judge workability on: price, the amount paid at CPCV, the CPCV date, and the CPCV-to-deed timing.",
  },
  job: {
    id: "job",
    title: "Job offer",
    tagline: "Employer and candidate check fit without anchoring salary.",
    sideLabels: { A: "Employer", B: "Candidate" },
    placeholder:
      "e.g. Base €65,000–75,000, start 1 October, up to 3 days remote per week, permanent contract.",
    checklist: [
      "Base salary (or range)",
      "Start date",
      "Work mode (remote days per week)",
      "Contract type",
    ],
    evaluatorHint:
      "This is a job offer negotiation. Judge workability on: base salary, start date, work mode (remote days per week), and contract type.",
  },
  otc: {
    id: "otc",
    title: "OTC trade",
    tagline: "Two desks probe a block trade without moving the market.",
    sideLabels: { A: "Seller", B: "Buyer" },
    placeholder:
      "e.g. Selling 250 ETH, no more than 1.5% below spot at reveal, settlement within 48h via escrow.",
    checklist: [
      "Asset & size",
      "Price bound (limit, or ±% vs a reference)",
      "Settlement date",
      "Settlement method",
    ],
    evaluatorHint:
      "This is an over-the-counter trade negotiation. Judge workability on: the asset and size, the price bound, the settlement date, and the settlement method.",
  },
};

/** Picker order on the create screen (property first — the primary demo case). */
export const USE_CASE_IDS = useCaseIdSchema.options;

export function getUseCase(id: UseCaseId): UseCasePreset {
  return USE_CASES[useCaseIdSchema.parse(id)];
}
