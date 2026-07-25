import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { RoomBookmark, RoomBookmarkStore } from "@/lib/room-bookmarks";
import { RecentRooms } from "./recent-rooms";

/** A store backed by an array — the same seam a future server adapter would fill. */
function fixtureStore(items: RoomBookmark[]): RoomBookmarkStore {
  let current = [...items];
  return {
    list: async () => current,
    remember: async () => undefined,
    forget: async (roomId) => {
      current = current.filter((b) => b.roomId !== roomId);
    },
    clear: async () => {
      current = [];
    },
  };
}

const meta: Meta<typeof RecentRooms> = {
  title: "web/RecentRooms",
  component: RecentRooms,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof RecentRooms>;

export const Default: Story = {
  args: {
    store: fixtureStore([
      { roomId: "r_a492d8b8", side: "A", savedAt: "2026-07-25T17:40:00.000Z" },
      { roomId: "r_9f3a1c02", side: "B", savedAt: "2026-07-24T09:15:00.000Z" },
    ]),
  },
};

/**
 * Renders nothing at all. Worth a story precisely because it is the state a
 * first-time visitor sees, and "nothing" is the intended design — an empty
 * "Rooms on this device" heading would just be noise on the landing page.
 */
export const Empty: Story = {
  args: { store: fixtureStore([]) },
};

/** Enough rows to check the list does not overwhelm the landing page. */
export const Several: Story = {
  args: {
    store: fixtureStore(
      Array.from({ length: 6 }, (_, i) => ({
        roomId: `r_${(i + 1).toString().padStart(8, "0")}`,
        side: i % 2 === 0 ? ("A" as const) : ("B" as const),
        savedAt: new Date(Date.UTC(2026, 6, 25 - i, 12, 0, 0)).toISOString(),
      })),
    ),
  },
};
