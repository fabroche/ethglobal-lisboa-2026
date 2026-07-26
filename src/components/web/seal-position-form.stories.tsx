import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SealPositionForm } from "./seal-position-form";
import { USE_CASES } from "@/session";

const meta: Meta<typeof SealPositionForm> = {
  title: "web/SealPositionForm",
  component: SealPositionForm,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof SealPositionForm>;

const base = {
  roomId: "r_9f3a",
  side: "A" as const,
  preset: USE_CASES.property,
  worldAppId: "app_staging_demo",
  submitCommitment: async () => ({ ok: true as const, sequenceNumber: 7 }),
};

export const Property: Story = { args: { ...base, enclaveSealKey: "aa".repeat(32) } };

export const JobAsCandidate: Story = {
  args: { ...base, side: "B", preset: USE_CASES.job, enclaveSealKey: "aa".repeat(32) },
};

/** The state we ship in while the 0G enclave seal key is pending (env-gated). */
export const SealKeyMissing: Story = { args: { ...base, enclaveSealKey: null } };

export const WorldNotConfigured: Story = {
  args: { ...base, enclaveSealKey: "aa".repeat(32), worldAppId: null },
};

export const SubmitFails: Story = {
  args: {
    ...base,
    enclaveSealKey: "aa".repeat(32),
    submitCommitment: async () => ({
      ok: false as const,
      message: "seat already taken for r_9f3a/A",
    }),
  },
};
