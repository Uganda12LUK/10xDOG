import * as Sentry from "@sentry/cloudflare";
import handler from "@astrojs/cloudflare/entrypoints/server";

// Gating here is runtime, not the build-time `sentryEnabled` helper in
// src/lib/sentry-env.ts: the worker decides from the Cloudflare `env` at request
// time, where `import.meta.env` isn't the right signal. An undefined SENTRY_DSN
// makes the SDK a no-op (handler still returned), so the worker never crashes.
export default Sentry.withSentry(
  (env: { SENTRY_DSN?: string; SENTRY_ENV?: string }) => ({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV ?? "production",
    tracesSampleRate: 0.1,
  }),
  handler,
);
