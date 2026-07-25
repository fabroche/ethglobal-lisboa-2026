import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShareButton } from "./share-button";

const meta: Meta<typeof ShareButton> = {
  title: "web/ShareButton",
  component: ShareButton,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof ShareButton>;

/** On a phone this opens the OS share sheet; in a desktop Storybook you get the fallback menu. */
export const Default: Story = {
  args: {
    url: "https://overlap.app/room/r_9f3a?side=A",
    roleLabel: "Seller",
    className: "w-80",
  },
};

export const Candidate: Story = {
  args: {
    url: "https://overlap.app/room/r_9f3a?side=B",
    roleLabel: "Candidate",
    className: "w-80",
  },
};
