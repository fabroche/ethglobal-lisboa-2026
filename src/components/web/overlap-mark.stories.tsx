import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OverlapMark } from "./overlap-mark";

const meta: Meta<typeof OverlapMark> = {
  title: "web/OverlapMark",
  component: OverlapMark,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof OverlapMark>;

export const Default: Story = {};
export const Large: Story = { args: { className: "h-16 w-auto" } };
