import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RoomQr } from "./room-qr";

const meta: Meta<typeof RoomQr> = {
  title: "web/RoomQr",
  component: RoomQr,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof RoomQr>;

export const Default: Story = {
  args: {
    roomId: "r_9f3a",
    joinUrl: "https://seam.app/room/r_9f3a?side=B",
  },
};

export const LongUrl: Story = {
  args: {
    roomId: "r_9f3a",
    joinUrl: "https://seam.app/room/r_9f3a?side=B&ref=very-long-tracking-token-that-should-truncate",
  },
};
