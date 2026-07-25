import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VerdictPanel } from "./verdict-panel";

const meta: Meta<typeof VerdictPanel> = {
  title: "web/VerdictPanel",
  component: VerdictPanel,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof VerdictPanel>;

export const Pending: Story = { args: { verdict: null } };
export const Workable: Story = { args: { verdict: "workable" } };
export const NotWorkable: Story = { args: { verdict: "not_workable" } };
export const GapTiming: Story = { args: { verdict: "gap:timing" } };
