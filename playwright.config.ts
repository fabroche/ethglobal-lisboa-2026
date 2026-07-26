import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the two-browser E2E (S3.4). Boots the real Next production
 * server against the real Hedera testnet topic and the real 0G enclave — only World
 * verification is faked (a headless browser cannot produce a human proof; see
 * `src/worldid/e2e-verifier.ts`). Run: `E2E_FAKE_WORLD=1 npm run test:e2e`.
 *
 * Requires a built app and the same `.env.local` the dev server uses (HEDERA_*, OG_*,
 * OG_DEMO_SEAL_SECRET, a non-empty WORLD_APP_ID). The webServer inherits the shell env,
 * so export the two E2E flags before running.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 320_000, // real deadline wait (~150s) + real 0G reveal + Mirror indexing
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuses a prebuilt `.next` (run `npm run build` first) — do NOT build here: a second
  // concurrent build into the same `.next` as a running dev server corrupts prerendering.
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_FAKE_WORLD: "1",
      APP_URL: "http://localhost:3100",
    },
  },
});
