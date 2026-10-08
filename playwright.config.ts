import { defineConfig } from "@playwright/test";

// Port the E2E run drives. Override with E2E_PORT when 4321 is taken
// (the webServer below starts the app on exactly this port).
const PORT = Number(process.env.E2E_PORT ?? 4321);
// Force IPv4 (127.0.0.1): astro preview's cloudflare runtime can bind IPv6 `::1`
// only, which makes a `localhost` health check miss the server intermittently.
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  // Serialize: one preview server backed by a remote Supabase (middleware calls
  // getUser() per request). Parallel workers hammering it caused navigation
  // timeouts; the suite is small, so serial is both stable and fast enough.
  workers: 1,
  timeout: 60_000,
  // Creates the two local-Supabase users the invitation-loop spec needs.
  // It no-ops (and that spec self-skips) when the local stack is unreachable,
  // so auth-gate specs still run on a machine without Docker.
  globalSetup: "tests/setup/playwright-global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Remote Supabase adds latency to every SSR response — allow headroom.
    navigationTimeout: 45_000,
  },
  // Production-like server: build, then preview, in a single long-lived npm
  // script (chaining two `npm run` invocations in Playwright's own shell makes
  // it treat the build's exit as an early server exit). `astro dev` is avoided
  // — the vite@8 dev runner crashes under this toolchain (see CLAUDE.md/memory).
  // `--ignore-lock` stops a stale preview lock from making a fresh start bail
  // ("Preview server already running") and exit, which Playwright reads as an
  // early server exit. `--host 127.0.0.1` keeps the bind on IPv4 (see baseURL).
  webServer: {
    command: `npm run e2e:preview -- --port ${PORT} --host 127.0.0.1 --ignore-lock`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Astro auto-detects the AI-agent env (CLAUDECODE via `am-i-vibing`) and
    // forces preview into background/daemon mode — which Playwright reads as the
    // server exiting early, and which also forbids --ignore-lock. Setting this
    // var disables that auto-detection so preview runs in the foreground; it does
    // NOT force background here (that needs the --background flag), it only tags
    // the lock file's metadata. See node_modules/astro/dist/cli/preview/index.js.
    env: { ASTRO_PREVIEW_BACKGROUND: "1" },
  },
});
