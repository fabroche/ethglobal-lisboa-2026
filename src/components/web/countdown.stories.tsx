import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Countdown } from "./countdown";

const meta: Meta<typeof Countdown> = {
  title: "web/Countdown",
  component: Countdown,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof Countdown>;

export const Future: Story = { args: { deadlineIso: "2099-01-01T00:00:00Z" } };
export const Past: Story = { args: { deadlineIso: "2000-01-01T00:00:00Z" } };
