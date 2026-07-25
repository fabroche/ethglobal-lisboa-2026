import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SelfieCheckGate } from "./selfie-check-gate";

const meta: Meta<typeof SelfieCheckGate> = {
  title: "web/SelfieCheckGate",
  component: SelfieCheckGate,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof SelfieCheckGate>;

const base = { roomId: "r_9f3a", side: "A" as const, onVerified: () => {} };

/** Mounts the real IDKit button (clicking opens the real widget — staging app id needed). */
export const Ready: Story = { args: { ...base, appId: "app_staging_demo", verified: false } };

export const Verified: Story = { args: { ...base, appId: "app_staging_demo", verified: true } };

export const NotConfigured: Story = { args: { ...base, appId: null, verified: false } };
