# Sentry Error Monitoring Implementation Plan

## Overview

Integrate Sentry into PawMeet for error monitoring plus light performance tracing, covering both the browser (React islands, Astro pages) and the server (SSR, middleware, API routes running on the Cloudflare Workers runtime). The integration must degrade gracefully when no DSN is configured, stay off in local dev, and work around a known incompatibility between `@sentry/astro`'s automatic server wrapping and `@astrojs/cloudflare` v14.

## Current State Analysis

- **No error tracking today.** Failures are surfaced ad-hoc: API routes swallow errors into `?error=` redirects (e.g. `src/pages/api/profile.ts:81`), and there is no central capture. Production SSR/worker exceptions are invisible beyond Cloudflare's own `observability.enabled` logs (`wrangler.jsonc:12`).
- **Runtime is Cloudflare Workers (workerd), not Node.** `astro.config.mjs:16` uses `adapter: cloudflare()`; `@astrojs/cloudflare` is `^14.3.1`. The standard `@sentry/astro` server SDK only works on Node runtimes — the server side must use `@sentry/cloudflare`.
- **Secrets follow an "optional, boots-without" convention.** `astro.config.mjs:17-22` declares `SUPABASE_URL`/`SUPABASE_KEY` via `astro:env/server` as `optional`; `src/lib/config-status.ts` reports unconfigured services and `Layout.astro:31` renders a `Banner`. Sentry's DSN should plug into this same pattern.
- **Wrangler is already Sentry-ready on compat settings.** `wrangler.jsonc` has `nodejs_compat` and `compatibility_date: 2026-05-08` (Sentry requires ≥ 2024-09-23). `main` currently points at `@astrojs/cloudflare/entrypoints/server` — the exact thing the server workaround must re-point.
- **Dev-only proof convention exists.** CLAUDE.md's "Visual gate" describes `import.meta.env.DEV`-guarded pages under `src/pages/dev/` that 404 in prod — the right home for a verification trap.
- **Local runtime verification is constrained.** Per project memory, `npm run dev` is unreliable under the agent; the viable path is `npm run build` + `npm run preview` (and `e2e:preview` which cleans dist first).

### Key Discoveries:

- **Known blocking bug `#21901`**: `@astrojs/cloudflare` v14 renamed the worker entry virtual id from `astrojs-ssr-virtual-entry` to `virtual:cloudflare/worker-entry`. `@sentry/astro`'s Vite plugin still targets the old id, so it silently leaves the worker's default export **unwrapped** — the build succeeds but server-side `Sentry.init` never runs. Official workaround: a manual worker-entry wrapper pointed to by `wrangler.jsonc` `main`. (https://github.com/getsentry/sentry-javascript/issues/21901)
- **Two SDKs, two init paths**: `@sentry/astro` for the client, `@sentry/cloudflare` for the worker. The worker wrapper reads its DSN from the raw Cloudflare `env` object (it runs outside Astro's module graph), while the client reads a build-time public env var. (https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/astro/)
- **Config-status pattern** at `src/lib/config-status.ts:11` is a plain array filtered into `missingConfigs` — adding a Sentry entry is a one-row append.

## Desired End State

When this plan is complete:

- A browser error in any React island or Astro page is captured and visible in the Sentry project, with a readable (source-mapped) stack trace for production builds.
- An unhandled error thrown in SSR / an API route / the worker fetch boundary is captured and visible in Sentry.
- Events carry an `environment` tag (`production` / `preview`), and Sentry stays **off** in local dev.
- With no DSN configured, the app boots exactly as today and surfaces a "Sentry not configured" note via the existing banner; the build never fails for a missing DSN or auth token.
- A dev-only `/dev/sentry-check` page exists to re-trigger both a client and a server error on demand; it 404s in production.

Verify via: `npm run build` succeeds with and without `SENTRY_DSN`/`SENTRY_AUTH_TOKEN`; `npm run preview` serves the app; triggering the trap page produces one client and one server event in the Sentry dashboard.

## What We're NOT Doing

- No Session Replay (decided: errors + light tracing only).
- No custom breadcrumbs, user-context enrichment, `beforeSend` scrubbing, or alert-rule configuration beyond SDK defaults.
- No conversion of existing `?error=` redirect handling into explicit `Sentry.captureException` calls — that is a follow-up observability change, not this one.
- No hard-failing the build/deploy when the DSN is absent (graceful no-op was chosen over "required on prod").
- No Sentry MCP usage — manual SDK + DSN configuration only.
- No changes to the local-dev runtime workarounds; this plan does not try to fix `npm run dev`.

## Implementation Approach

Build bottom-up: first make DSN/config plumbing exist and degrade gracefully (so every later phase can be built and booted safely), then wire the client, then the server workaround (the riskiest, isolated phase), then source-map upload in CI, and finally a dev-only trap to prove both capture paths. Each phase is independently build-verifiable; the client and server capture paths get their own manual confirmation against the live Sentry project.

## Critical Implementation Details

- **The server wrapper file is the worker entry, not Astro's server config.** `@sentry/astro` auto-detects a root `sentry.server.config.*` for its (broken-on-v14) Node-style injection. We are deliberately bypassing that path. The file we create is a Cloudflare **worker entry** that `wrangler.jsonc` `main` points at; it wraps `@astrojs/cloudflare/entrypoints/server` with `Sentry.withSentry`. Keep the client file named `sentry.client.config.ts` so the integration still auto-injects the client init.
- **Two DSN read paths.** The client init reads a build-time **public** var (exposed to the browser bundle — a DSN is a publishable value). The worker wrapper reads the DSN from its raw Cloudflare `env` parameter, supplied by `.dev.vars` locally and a wrangler var in prod. The `config-status` banner check reads the public var server-side. Plan for the same DSN string reachable via both an `astro:env` public field and the raw worker `env`.
- **Environment gating.** "Off in local dev" is enforced by only initializing when a DSN is present AND the environment is not dev (`import.meta.env.PROD` on the client; the worker is only reached in deployed envs). The `environment` tag distinguishes `production` from `preview` (derive from a Cloudflare env var, defaulting to `production`).

## Phase 1: Dependencies & configuration plumbing

### Overview

Install both SDKs and establish DSN wiring + graceful-degradation so later phases can build and boot with or without secrets.

### Changes Required:

#### 1. Dependencies

**File**: `package.json`

**Intent**: Add the two Sentry SDKs as runtime dependencies.

**Contract**: `@sentry/astro` and `@sentry/cloudflare` added under `dependencies`; lockfile updated via `npm install`.

#### 2. Env schema + example files

**File**: `astro.config.mjs`, `.env.example`, `.dev.vars`, `.env.test`

**Intent**: Declare the Sentry DSN as an optional, client-public env var so both the client init and the server-side config-status check can read it, and document it in the example/secret files alongside the Supabase vars.

**Contract**: Add a `PUBLIC_SENTRY_DSN` field to the `astro:env` schema as `context: "client", access: "public", optional: true`. Append `PUBLIC_SENTRY_DSN` (and a commented `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` for later phases) to `.env.example`. Add the DSN to `.dev.vars`/`.env.test` as empty/placeholder so local + test builds stay no-op.

#### 3. Config-status entry

**File**: `src/lib/config-status.ts`

**Intent**: Surface "Sentry not configured" through the existing banner pattern when the DSN is absent.

**Contract**: Append one `ConfigStatus` row: `configured: Boolean(PUBLIC_SENTRY_DSN)`, Polish `message` consistent with the Supabase row, optional docs link. Imports `PUBLIC_SENTRY_DSN` from `astro:env/client`.

#### 4. Environment gating helper

**File**: `src/lib/sentry-env.ts` (new)

**Intent**: Single source of truth for "should Sentry initialize" and "which environment tag", shared by client and (conceptually) worker config.

**Contract**: Export `sentryEnabled(dsn: string | undefined): boolean` (true only when a DSN exists and the runtime is not local dev) and `sentryEnvironment(): "production" | "preview"`. No snippet — small pure functions.

### Success Criteria:

#### Automated Verification:

- Dependencies install cleanly: `npm install`
- Linting passes: `npm run lint`
- Production build passes with no DSN set: `npm run build`

#### Manual Verification:

- Running the app (`npm run preview`) with no DSN shows the existing banner plus the new "Sentry not configured" note and the app otherwise behaves as before.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Client-side error monitoring

### Overview

Initialize Sentry in the browser via `@sentry/astro`, gated by DSN + environment, with light tracing.

### Changes Required:

#### 1. Astro integration

**File**: `astro.config.mjs`

**Intent**: Register the `@sentry/astro` integration so it injects the client init and (later) handles source maps. Server auto-wrapping from this integration is knowingly inert on v14 and is handled manually in Phase 3.

**Contract**: Add `sentry()` to the `integrations` array. For this phase pass no source-map options (added in Phase 4). Import from `@sentry/astro`.

#### 2. Client init config

**File**: `sentry.client.config.ts` (new, project root)

**Intent**: Initialize the browser SDK with DSN, environment tag, and a low tracing sample rate; no-op when disabled.

**Contract**: Calls `Sentry.init` from `@sentry/astro` with `dsn` from `PUBLIC_SENTRY_DSN`, `environment` from the gating helper, `tracesSampleRate: 0.1`, and guarded so it does not init when the DSN is absent or in local dev. Must not enable Replay integrations.

### Success Criteria:

#### Automated Verification:

- Build passes with a DSN set: `PUBLIC_SENTRY_DSN=<dsn> npm run build`
- Build still passes with no DSN: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- With a DSN configured, a deliberately thrown client-side error (temporary throw in a page/island, or via Phase 5 trap) appears in the Sentry dashboard within ~1 minute.
- No Sentry network requests fire when running locally without a DSN.

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 3: Server-side error monitoring (Cloudflare Workers workaround)

### Overview

Capture errors at the worker fetch boundary by manually wrapping the Cloudflare entry with `@sentry/cloudflare`, working around issue #21901.

### Changes Required:

#### 1. Worker entry wrapper

**File**: `sentry.server.config.ts` (new, project root)

**Intent**: Replace the default worker entry with one that initializes `@sentry/cloudflare` and delegates to Astro's Cloudflare handler, so SSR/API/worker errors are captured. This is the documented workaround for the v14 auto-wrap failure.

**Contract**: Default-exports `Sentry.withSentry((env) => ({ dsn, environment, tracesSampleRate }), handler)` where `handler` is the default import from `@astrojs/cloudflare/entrypoints/server` and `Sentry` is `@sentry/cloudflare`. DSN + environment come from the raw `env` param; when `env` has no DSN the wrapper still returns the plain handler (no-op). Snippet (load-bearing, non-obvious — this is the crux of the change):

```ts
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
```

#### 2. Point wrangler at the wrapper

**File**: `wrangler.jsonc`

**Intent**: Make the deployed worker use the wrapped entry instead of the raw Astro entry.

**Contract**: Change `main` from `@astrojs/cloudflare/entrypoints/server` to `./sentry.server.config.ts`. Leave `nodejs_compat`, `compatibility_date`, `assets`, and `observability` untouched.

#### 3. Server DSN secret wiring

**File**: `.dev.vars`, deploy docs/notes

**Intent**: Supply the worker's `SENTRY_DSN`/`SENTRY_ENV` via the Cloudflare env (separate from the client's public var).

**Contract**: Add `SENTRY_DSN` (+ optional `SENTRY_ENV`) to `.dev.vars`; document that prod sets them via `wrangler secret`/vars. No schema change (worker reads raw `env`, not `astro:env`).

### Success Criteria:

#### Automated Verification:

- Preview build + server boot: `npm run build && npm run preview` starts without error
- Worker entry resolves (build emits a worker using `sentry.server.config.ts`): `npm run build` shows no unresolved-entry error
- Linting + typecheck pass: `npm run lint`

#### Manual Verification:

- With a DSN configured in the preview/deployed env, an unhandled error thrown in an API route (or via the Phase 5 server trap) appears in Sentry as a server-side event with the correct `environment` tag.
- Confirm the event is genuinely from the worker boundary (not the client), proving the #21901 workaround is active.

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 4: Conditional source-maps upload in CI

### Overview

Upload source maps during the Sentry integration build when an auth token is present, so production stack traces are readable — without breaking builds that lack the token.

### Changes Required:

#### 1. Source-map options on the integration

**File**: `astro.config.mjs`

**Intent**: Configure the `@sentry/astro` integration to upload source maps using org/project/auth-token from env, enabled only when the token exists.

**Contract**: Pass `sourceMapsUploadOptions: { org, project, authToken }` (from `process.env.SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`) to `sentry()`, with upload effectively disabled when `SENTRY_AUTH_TOKEN` is unset so local/no-secret builds skip it cleanly.

#### 2. CI secret documentation

**File**: `.github/workflows/ci.yml` (and/or CLAUDE.md CI note)

**Intent**: Make the build step pass `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` from repo secrets when present.

**Contract**: Add the three env vars to the build step sourced from `secrets.*`; absence must not fail the step. Document the required repo secrets near the existing Supabase-secrets note.

### Success Criteria:

#### Automated Verification:

- Build with no auth token skips upload and succeeds: `npm run build`
- Build with a token attempts upload without error (local dry check acceptable): `SENTRY_AUTH_TOKEN=<t> SENTRY_ORG=<o> SENTRY_PROJECT=<p> npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- After a CI build with secrets set, a production Sentry event shows un-minified frames (original file/line).
- A CI run without the secrets still goes green.

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 5: Dev-only verification trap & final proof

### Overview

Add a dev-only page to re-trigger client and server errors on demand, then prove both capture paths end-to-end.

### Changes Required:

#### 1. Trap page + server endpoint

**File**: `src/pages/dev/sentry-check.astro` (new), `src/pages/api/dev/sentry-error.ts` (new)

**Intent**: Provide a repeatable way to throw a client error (button in a small island or inline script) and a server error (API endpoint), both guarded so they only exist in dev.

**Contract**: Both guard with `import.meta.env.DEV` and return/respond 404 otherwise (mirroring the kitchen-sink convention). The page offers a control that throws in the browser; the endpoint throws an unhandled error server-side. No production exposure.

### Success Criteria:

#### Automated Verification:

- Production build does not expose the route: after `npm run build`, `/dev/sentry-check` and `/api/dev/sentry-error` are absent/404 (assert via preview `curl` or an existing test pattern)
- Linting passes: `npm run lint`

#### Manual Verification:

- In a DSN-configured env, clicking the client trap produces one browser event in Sentry; hitting the server endpoint produces one worker event — confirming both paths from Phases 2 and 3.
- The route is confirmed 404 in a production build.

**Implementation Note**: Final phase — confirm both events land in the Sentry dashboard.

---

## Testing Strategy

### Unit Tests:

- `src/lib/sentry-env.ts`: `sentryEnabled` returns false for empty DSN and in dev, true for a DSN in prod; `sentryEnvironment` maps the env var to `production`/`preview`. (Vitest, mirroring `tests/unit/discovery.test.ts`.)

### Integration Tests:

- None automated for live capture (requires the external Sentry service); covered by the manual trap-page verification.

### Manual Testing Steps:

1. Build + preview with a DSN set; open `/dev/sentry-check`, trigger the client error, confirm it in Sentry.
2. Hit the server error endpoint, confirm a separate server event with the right `environment` tag.
3. Build with no DSN; confirm the app boots, the banner notes Sentry is unconfigured, and no Sentry requests fire.
4. Confirm `/dev/sentry-check` 404s in a production build.

## Performance Considerations

`tracesSampleRate: 0.1` keeps tracing overhead and free-plan event volume low. Client SDK adds bundle weight to hydrated islands only; Replay (the heaviest piece) is excluded. Worker-side `withSentry` adds negligible per-request overhead.

## Migration Notes

No data migration. The only deploy-time consideration: after Phase 3, the worker entry changes — confirm `wrangler deploy` picks up `sentry.server.config.ts` and set `SENTRY_DSN` as a Cloudflare secret/var before/with that deploy. Rollback is reverting `main` in `wrangler.jsonc` and removing the integration.

## References

- Sentry — Astro on Cloudflare: https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/astro/
- Known v14 server-wrap bug + workaround: https://github.com/getsentry/sentry-javascript/issues/21901
- Config-status / optional-secret pattern: `src/lib/config-status.ts:11`, `src/layouts/Layout.astro:31`
- Wrangler entry + compat settings: `wrangler.jsonc:4-14`
- Existing unit-test pattern: `tests/unit/discovery.test.ts`
- Dev-only gated page convention: CLAUDE.md "Visual gate = dev-only kitchen sink"

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dependencies & configuration plumbing

#### Automated

- [x] 1.1 Dependencies install cleanly: `npm install`
- [x] 1.2 Linting passes: `npm run lint`
- [x] 1.3 Production build passes with no DSN set: `npm run build`

#### Manual

- [x] 1.4 Preview with no DSN shows the banner + "Sentry not configured" note; app behaves as before

### Phase 2: Client-side error monitoring

#### Automated

- [ ] 2.1 Build passes with a DSN set: `PUBLIC_SENTRY_DSN=<dsn> npm run build`
- [ ] 2.2 Build still passes with no DSN: `npm run build`
- [ ] 2.3 Linting passes: `npm run lint`

#### Manual

- [ ] 2.4 Thrown client error appears in the Sentry dashboard with a DSN configured
- [ ] 2.5 No Sentry requests fire locally without a DSN

### Phase 3: Server-side error monitoring (Cloudflare Workers workaround)

#### Automated

- [ ] 3.1 Preview build + server boot: `npm run build && npm run preview` starts without error
- [ ] 3.2 Worker entry resolves using `sentry.server.config.ts`: `npm run build` shows no unresolved-entry error
- [ ] 3.3 Linting + typecheck pass: `npm run lint`

#### Manual

- [ ] 3.4 Unhandled API/SSR error appears in Sentry as a server event with the correct `environment` tag
- [ ] 3.5 Event confirmed to originate from the worker boundary (#21901 workaround active)

### Phase 4: Conditional source-maps upload in CI

#### Automated

- [ ] 4.1 Build with no auth token skips upload and succeeds: `npm run build`
- [ ] 4.2 Build with a token attempts upload without error: `SENTRY_AUTH_TOKEN=<t> SENTRY_ORG=<o> SENTRY_PROJECT=<p> npm run build`
- [ ] 4.3 Linting passes: `npm run lint`

#### Manual

- [ ] 4.4 Production Sentry event shows un-minified frames after a CI build with secrets
- [ ] 4.5 A CI run without the secrets still goes green

### Phase 5: Dev-only verification trap & final proof

#### Automated

- [ ] 5.1 Production build does not expose `/dev/sentry-check` or `/api/dev/sentry-error` (404)
- [ ] 5.2 Linting passes: `npm run lint`

#### Manual

- [ ] 5.3 Client trap produces one browser event and server endpoint produces one worker event in Sentry
- [ ] 5.4 Route confirmed 404 in a production build
