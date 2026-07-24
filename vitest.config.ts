import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  // Evita cargar postcss.config.mjs (formato Tailwind v4 que Vite no procesa).
  css: { postcss: { plugins: [] } },
});
