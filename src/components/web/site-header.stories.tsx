import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SiteHeader } from "./site-header";

const meta: Meta<typeof SiteHeader> = {
  title: "web/SiteHeader",
  component: SiteHeader,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof SiteHeader>;

/**
 * The whole component — it takes no props, and that is the point.
 *
 * Nothing here varies with the page or with who is looking: no room id, no
 * breadcrumb, no room count, and the Rooms link is present whether or not this
 * device remembers any (S3.12). The header appears in every screenshot anyone
 * takes of Seam, so anything that changed with the user's state would be
 * reporting that state to whoever is looking at the screen.
 */
export const Default: Story = {};

/** In context, so the sticky border and backdrop can be judged against content. */
export const OverContent: Story = {
  render: () => (
    <div className="min-h-[60vh] bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-muted-foreground">
          Page content scrolls under the header, which stays put.
        </p>
      </main>
    </div>
  ),
};
