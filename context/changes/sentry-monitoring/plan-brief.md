# Sentry Error Monitoring — Plan Brief

> Full plan: `context/changes/sentry-monitoring/plan.md`

## What & Why

Add Sentry error monitoring (plus light performance tracing) to PawMeet so browser and server failures become visible instead of being swallowed into redirects or lost in Cloudflare logs. The app currently has no error tracking at all.

## Starting Point

Astro 7 SSR on the Cloudflare Workers runtime (`@astrojs/cloudflare` v14.3.1), React 19 islands, Supabase auth. Secrets already follow an "optional, boots-without" convention (`config-status.ts` + a `Banner`), and `wrangler.jsonc` already carries the `nodejs_compat` flag and a recent `compatibility_date` Sentry needs.

## Desired End State

Browser and server errors land in the Sentry project with correct `environment` tags and (in prod CI builds) readable source-mapped stack traces. Sentry stays off in local dev, and the app boots unchanged with a "not configured" banner note when no DSN is set. A dev-only `/dev/sentry-check` page re-triggers both error paths and 404s in production.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope | Server + client | Full coverage of the critical flows, per course-aligned observability intent | Plan |
| SDKs | `@sentry/astro` (client) + `@sentry/cloudflare` (server) | Astro's server SDK is Node-only; the Workers runtime needs the Cloudflare SDK | Plan |
| Server wrapping | Manual worker-entry wrap via `wrangler main` | Works around bug #21901 where v14 silently leaves the worker unwrapped | Plan |
| Features | Errors + light tracing (`tracesSampleRate 0.1`) | Useful signal without burning the free-plan event quota | Plan |
| Source maps | Upload conditionally in CI (only if `SENTRY_AUTH_TOKEN` set) | Readable prod traces while local/no-secret builds still pass | Plan |
| Environments | Prod + preview, off in local dev | Clean data, no dev noise, saves quota | Plan |
| Missing DSN | Graceful no-op + `config-status` entry | Matches the repo's optional-secret convention; build never breaks | Plan |
| Verification | Dev-only trap page (client + server) | Repeatable proof of both paths, 404 in prod per kitchen-sink convention | Plan |
| MCP | Not used | Manual SDK + DSN config chosen | Plan |

## Scope

**In scope:** two Sentry SDKs; client + worker init with env/dev gating; DSN plumbing through the optional-secret pattern; the #21901 worker-entry workaround; conditional CI source-map upload; a dev-only verification trap; a unit test for the gating helper.

**Out of scope:** Session Replay; custom breadcrumbs/user context/`beforeSend` scrubbing; alert rules; converting existing `?error=` handlers into `captureException` calls; hard-failing when the DSN is missing; fixing local `npm run dev`.

## Architecture / Approach

Client: `@sentry/astro` integration in `astro.config.mjs` reads `sentry.client.config.ts`, which inits from a build-time public DSN and the env-gating helper. Server: a new `sentry.server.config.ts` worker entry wraps `@astrojs/cloudflare/entrypoints/server` with `@sentry/cloudflare`'s `withSentry`, reading its DSN from the raw Cloudflare `env`; `wrangler.jsonc` `main` points at it. Source-map upload rides the same client integration, gated on an auth token. Everything no-ops without a DSN.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Plumbing | Both SDKs installed, DSN env wiring, config-status entry, gating helper | Env var reachable on both client and server paths |
| 2. Client | Browser error + tracing capture, gated | Integration's inert server-wrap causing confusion |
| 3. Server (workaround) | Worker-boundary capture via manual wrap | #21901 — silent no-capture if the wrap/`main` is wrong |
| 4. Source maps in CI | Readable prod traces, conditional upload | Build breaking when the token is absent |
| 5. Dev trap + proof | Repeatable client+server error triggers | Route accidentally shipping to prod |

**Prerequisites:** a Sentry account + project (DSN); for Phase 4, `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` as repo secrets. Local verification uses `npm run build` + `npm run preview` (dev server is unreliable here).
**Estimated effort:** ~2–3 sessions across 5 small phases.

## Open Risks & Assumptions

- **#21901 is unfixed** (feature-request status); the manual worker-entry wrap is the interim solution and must be confirmed to actually capture a server event, not just build.
- A future `@sentry/astro`/`@astrojs/cloudflare` upgrade may restore auto-wrapping and make the manual entry redundant — revisit then.
- Live capture can't be asserted by automated tests (external service); the dev trap + manual dashboard check is the proof.
- Client and worker read the DSN via different paths (public astro env vs raw worker env); both must be supplied in deployed envs.

## Success Criteria (Summary)

- A client error and a server error, triggered from `/dev/sentry-check`, both appear in the Sentry dashboard with correct environment tags.
- Builds pass with and without `SENTRY_DSN`/`SENTRY_AUTH_TOKEN`; the app boots and only shows a "not configured" note when the DSN is absent.
- Production stack traces are source-mapped after a CI build with secrets; `/dev/sentry-check` 404s in production.
