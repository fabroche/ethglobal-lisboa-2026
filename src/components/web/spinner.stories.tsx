import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Spinner } from "./spinner";

const meta: Meta<typeof Spinner> = {
  title: "web/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof Spinner>;

export const Medium: Story = { args: { size: "md" } };
export const Small: Story = { args: { size: "sm" } };

/**
 * It inherits `currentColor`, so it takes the tone of whatever state owns it rather than
 * introducing a colour of its own.
 */
export const InheritsColour: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <Spinner size="sm" /> pending
      </span>
      <span className="flex items-center gap-2 text-muted-foreground">
        <Spinner size="sm" /> muted
      </span>
    </div>
  ),
};

/**
 * How it appears in context: never alone. The label is what a screen reader announces —
 * the spinner itself is `aria-hidden`, because "loading spinner" tells nobody anything.
 */
export const WithLabel: Story = {
  render: () => (
    <p
      role="status"
      className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-amber-600 dark:text-amber-400"
    >
      <Spinner />
      Revealing
    </p>
  ),
};
