import { defineConfig, devices } from "@playwright/test";

/*
 * Browser tests run against a LOCAL Supabase (npm run db:start) — never production.
 *   Locally:  npm run dev   (PAYMOB_MOCK=1)  then  E2E_MOCK_PAYMENTS=1 npm run e2e
 *   CI:       npm run build, then npm run e2e starts `next start` itself.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* CI writes .env.local before this runs; without it global-setup explains what's missing. */
}

const port = 3020;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Tests share the buyer account and its cart, so run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? `npx next start -p ${port}` : "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
