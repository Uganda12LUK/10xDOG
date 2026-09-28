# Phase 1 Integration Tests — Plan Brief

> Full plan: `context/changes/testing-bootstrap-critical-path/plan.md`
> Research: `context/changes/testing-bootstrap-critical-path/research.md`

## What & Why

Bootstrap vitest and Playwright from zero and immediately write integration tests that prove the three highest-priority risks from the test plan cannot silently regress: the walk-invitation loop end-to-end, auth gating on all protected routes, and the meeting state machine that excludes pending/declined invitations.

## Starting Point

No test runner, no test scripts, no test files, and no vitest config exist today. `playwright` binary (`^1.49.0`) is already in `dependencies` (should be devDependencies). `@supabase/supabase-js` and the `supabase` CLI are installed; a local Supabase instance with five applied migrations can be started via `npx supabase start` (port 54321).

## Desired End State

`npm run test` runs vitest and passes all integration tests; `npm run test:e2e` runs Playwright and passes the browser-driven invitation loop. No test data leaks between runs. A CI runner with Docker can execute `npx supabase start && npm run test` and get a green suite.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-----------------|--------|
| Test DB | Local `supabase start` (Docker) | CLI and config.toml already present; migrations apply automatically; no external secrets needed | Plan |
| Test file location | `tests/` top-level (`tests/integration/`, `tests/e2e/`) | Clean separation from src/; avoids Astro/Cloudflare build exclusion complexity | Plan |
| /events protection | Document as confirmed public, not added to PROTECTED_ROUTES | Route is a "coming soon" placeholder; public access is intentional today | Plan |
| Risk #1 coverage | vitest SDK-level integration + Playwright e2e browser test | SDK tests prove state machine correctness; browser test proves UI delivery and cookie session | Plan |
| Risks #2 + #3 | vitest integration only (no Playwright) | HTTP fetch for redirect checks and direct SDK calls for state machine give full signal at lower cost | Plan |
| vitest environment | `node` (not jsdom) | `@supabase/supabase-js` requires native `fetch` and Node APIs | Research |

## Scope

**In scope:**
- Install vitest, @vitest/coverage-v8, @playwright/test (devDeps); move playwright to devDeps
- `vitest.config.ts`, `playwright.config.ts`, `tests/helpers/supabase.ts`
- Auth-gating tests for all 6 PROTECTED_ROUTES + /events confirmation (Risk #2)
- Invitation state machine tests: inbox delivery, pending/declined exclusion, accepted visibility for both parties (Risks #1/#3)
- Playwright e2e browser test: full two-user send → inbox → accept → meeting-visible flow (Risk #1)

**Out of scope:**
- CI wiring (test-plan Phase 4)
- Coverage thresholds or reports
- RLS / IDOR tests (test-plan Phase 2)
- Breeding-filter tests (test-plan Phase 3)

## Architecture / Approach

Risk #2 tests use `fetch` with `redirect: 'manual'` against the Astro dev server (started by vitest `globalSetup`). The server needs no real Supabase connection — the middleware redirects when `user = null`. Risks #1 and #3 tests call service functions from `src/lib/services/invitation.ts` directly with authenticated Supabase JS clients pointed at the local Supabase instance — no HTTP layer involved. The Playwright e2e test uses two browser contexts (one per user) and `playwright.config.ts`'s `webServer` block to start the dev server automatically.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|----------------|---------|
| 1. Bootstrap | vitest + Playwright installed; test helpers; directory scaffold | `vitest.config.ts` needs `environment: 'node'` — wrong env silently breaks Supabase SDK |
| 2. Auth gating | 7 integration tests (6 redirect + /events public) | globalSetup must kill the child process on teardown or vitest hangs |
| 3. State machine | 4 integration tests covering pending/declined exclusion and accepted visibility | Test users must be cleaned up (auth.users + invitations rows) or data leaks across runs |
| 4. Browser e2e | 1 Playwright test: full two-user invitation loop in a real browser | Playwright global-setup must create test users before browser tests run |

**Prerequisites:** Docker (for `npx supabase start`); Node.js v22.14.0 (per `.nvmrc`); Cloudflare-compatible dev server (`npm run dev`) on port 4321  
**Estimated effort:** ~2–3 focused sessions across 4 phases

## Open Risks & Assumptions

- `npm run dev` startup time under vitest `globalSetup` is assumed to be under the 5 s poll timeout; if the Cloudflare workerd runtime is slower to start, the timeout needs extending.
- Local Supabase service-role key is treated as a non-secret dev value; if the team CI policy requires it to be a managed secret, `.env.test` approach needs a CI secrets step added in Phase 4.

## Success Criteria (Summary)

- `npm run test` exits green with 11 passing integration tests (7 auth-gating + 4 state-machine)
- `npm run test:e2e` exits green with 1 Playwright test passing
- No orphaned rows in the local Supabase `invitations` table after either test command completes
