import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the tsconfig path alias so src/ modules resolve in tests.
      "@/": resolve(__dirname, "src") + "/",
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    globalSetup: ["tests/setup/global-setup.ts"],
    passWithNoTests: true,
  },
});
