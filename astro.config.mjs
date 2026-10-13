// @ts-check
import process from "node:process";

import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// Source-map upload is enabled only when an auth token is present, so local
// and no-secret CI builds skip it cleanly. @sentry/astro reads org/project/
// authToken as top-level options (falling back to SENTRY_* env vars).
const sentrySourceMapsOptions = process.env.SENTRY_AUTH_TOKEN
  ? {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }
  : {};

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap(), sentry(sentrySourceMapsOptions)],
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_SENTRY_DSN: envField.string({ context: "client", access: "public", optional: true }),
    },
  },
});
