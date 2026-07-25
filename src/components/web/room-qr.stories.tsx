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

/**
 * What you get with the default `APP_URL` — and what a phone cannot reach, since
 * it resolves `localhost` to itself. Worth a story because this state is the DEFAULT
 * in dev, so it is the one most likely to be on screen during a demo (S3.6).
 */
export const UnreachableLocalhost: Story = {
  args: {
    roomId: "r_9f3a",
    joinUrl: "http://localhost:3000/room/r_9f3a?side=B",
  },
};

/** The fix: served on a LAN address, so the QR actually scans. No warning. */
export const LanAddress: Story = {
  args: {
    roomId: "r_9f3a",
    joinUrl: "http://10.1.1.167:3000/room/r_9f3a?side=B",
  },
};
