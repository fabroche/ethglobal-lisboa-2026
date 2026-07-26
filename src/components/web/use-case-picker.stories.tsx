import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UseCasePicker } from "./use-case-picker";
import type { UseCaseId } from "@/session";

const meta: Meta<typeof UseCasePicker> = {
  title: "web/UseCasePicker",
  component: UseCasePicker,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof UseCasePicker>;

function Interactive({ initial }: { initial: UseCaseId }) {
  const [value, setValue] = useState<UseCaseId>(initial);
  return <UseCasePicker value={value} onChange={setValue} className="w-96 max-w-full" />;
}

export const Default: Story = {
  render: () => <Interactive initial="property" />,
};

export const OtcSelected: Story = {
  render: () => <Interactive initial="otc" />,
};
