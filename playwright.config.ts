import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/setup/playwright-global-setup.ts",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4321",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
