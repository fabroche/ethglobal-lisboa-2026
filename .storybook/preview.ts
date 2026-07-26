import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // The app is App Router throughout. Without this, Storybook mounts the PAGES router
    // context, and any story whose component calls `useRouter` from `next/navigation`
    // (create-room-form since S3.8) crashes on mount with "expected app router to be
    // mounted". With it, router.push becomes a logged mock action instead.
    nextjs: { appDirectory: true },
  },
};

export default preview;
