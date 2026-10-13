import * as Sentry from "@sentry/cloudflare";
import handler from "@astrojs/cloudflare/entrypoints/server";

export default Sentry.withSentry(
  (env: { SENTRY_DSN?: string; SENTRY_ENV?: string }) => ({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV ?? "production",
    tracesSampleRate: 0.1,
  }),
  handler,
);
