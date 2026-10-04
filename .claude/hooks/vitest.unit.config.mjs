import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Per-edit hook config: unit tests ONLY. Deliberately omits the root config's
// globalSetup (which boots a dev server) so the scoped hook runs fast and
// without Supabase/the dev server. Integration + e2e stay in the root config,
// run by CI / `npm test`, never per edit.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export default defineConfig({
  resolve: {
    alias: {
      "@/": resolve(root, "src") + "/",
    },
  },
  test: {
    root,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: true,
  },
});
