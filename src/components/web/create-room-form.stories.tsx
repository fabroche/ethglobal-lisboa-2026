import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CreateRoomForm } from "./create-room-form";

const meta: Meta<typeof CreateRoomForm> = {
  title: "web/CreateRoomForm",
  component: CreateRoomForm,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof CreateRoomForm>;

export const Default: Story = {
  args: {
    createRoom: async (deadlineIso: string) => ({
      roomId: "r_9f3a",
      joinUrl: `https://seam.app/room/r_9f3a?side=B&d=${encodeURIComponent(deadlineIso)}`,
    }),
  },
};

export const ActionFails: Story = {
  args: {
    createRoom: async () => {
      throw new Error("Hedera account not configured");
    },
  },
};
