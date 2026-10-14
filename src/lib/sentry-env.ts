// Build-time gating for Sentry. Pure helpers so later phases (client/server init
// and the worker wrapper) share one decision about whether monitoring runs and
// which environment to tag — never active in local dev, never without a DSN.

/**
 * Whether Sentry should initialize: only with a non-empty DSN and outside local
 * dev (so `npm run dev` stays a no-op even if a DSN leaks into the environment).
 */
export function sentryEnabled(dsn: string | undefined): boolean {
  return Boolean(dsn) && import.meta.env.PROD;
}

/**
 * Environment tag for Sentry events. "preview" for preview builds, otherwise
 * "production". A build-time hint only — the Cloudflare worker tags its own
 * runtime environment in Phase 3.
 */
export function sentryEnvironment(): "production" | "preview" {
  return import.meta.env.MODE === "preview" ? "preview" : "production";
}
