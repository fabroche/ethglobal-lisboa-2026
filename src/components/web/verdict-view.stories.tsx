import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VerdictView } from "./verdict-view";

const meta: Meta<typeof VerdictView> = {
  title: "web/VerdictView",
  component: VerdictView,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof VerdictView>;

/** Clock still running: countdown above, sealed panel below. */
export const Pending: Story = {
  args: { deadlineIso: "2099-01-01T00:00:00Z", initialVerdict: null },
};

/**
 * Resolved room (S3.22): the countdown is gone — nothing is due any more — and its place
 * shows when the verdict was published, a fact checkable against the topic. Before this,
 * the screen sat on "Reveal due · now" forever.
 */
export const Resolved: Story = {
  args: {
    deadlineIso: "2020-01-01T00:00:00Z",
    initialVerdict: "not_workable",
    publishedAtIso: "2026-07-26T00:14:09Z",
  },
};
