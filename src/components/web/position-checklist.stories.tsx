import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PositionChecklist } from "./position-checklist";
import { USE_CASES } from "@/session";

const meta: Meta<typeof PositionChecklist> = {
  title: "web/PositionChecklist",
  component: PositionChecklist,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof PositionChecklist>;

export const Property: Story = {
  args: { items: USE_CASES.property.checklist, className: "w-96 max-w-full" },
};
export const Otc: Story = {
  args: { items: USE_CASES.otc.checklist, className: "w-96 max-w-full" },
};
