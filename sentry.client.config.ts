// Browser-side Sentry init, auto-detected by the @sentry/astro integration at
// project root. Gated by the Phase 1 helper so it is a no-op without a DSN and
// in local dev; light tracing only (no Session Replay).
import * as Sentry from "@sentry/astro";
import { PUBLIC_SENTRY_DSN } from "astro:env/client";

import { sentryEnabled, sentryEnvironment } from "@/lib/sentry-env";

if (sentryEnabled(PUBLIC_SENTRY_DSN)) {
  Sentry.init({
    dsn: PUBLIC_SENTRY_DSN,
    environment: sentryEnvironment(),
    tracesSampleRate: 0.1,
  });
}
