import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { JoinRoomPanel } from "./join-room-panel";

const meta: Meta<typeof JoinRoomPanel> = {
  title: "web/JoinRoomPanel",
  component: JoinRoomPanel,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof JoinRoomPanel>;

export const SideA: Story = { args: { roomId: "r_9f3a", side: "A" } };
export const SideB: Story = { args: { roomId: "r_9f3a", side: "B" } };
export const UnknownSide: Story = { args: { roomId: "r_9f3a", side: null } };
