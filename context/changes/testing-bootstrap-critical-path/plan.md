# Phase 1 Integration Tests — Bootstrap and Critical-Path Coverage

## Overview

Stand up vitest and Playwright from scratch, then prove the three highest-priority risks from the test plan regress automatically: the walk-invitation loop end-to-end (Risk #1), unauthenticated access to protected routes (Risk #2), and the meeting state machine excluding pending/declined invitations (Risk #3).

## Current State Analysis

No test runner, no test files, no vitest config, and no test scripts exist today. `playwright` binary (`^1.49.0`) is in `dependencies` (not `devDependencies`), but `@playwright/test` is absent. `@supabase/supabase-js` (`^2.99.1`) is installed. The `supabase` CLI (`^2.23.4`) is in devDependencies with `supabase/config.toml` and five migrations ready to apply; local DB runs on port 54322, local API on port 54321 after `npx supabase start`.

### Key Discoveries

- All meeting state lives in the single `invitations` table (`status`: `pending` / `accepted` / `declined`). There is no separate meetings table. `listAcceptedMeetings` at `src/lib/services/invitation.ts:111` filters `status = 'accepted'` — one equality check. (`src/lib/services/invitation.ts:105-118`)
- Service functions accept a `SupabaseClient` argument (`sendInvitation`, `respondToInvitation`, `listReceivedPending`, `listAcceptedMeetings` in `src/lib/services/invitation.ts`). Integration tests can import and call them directly with an authenticated SDK client — no HTTP layer needed for Risks #1 and #3.
- `PROTECTED_ROUTES` at `src/middleware.ts:5` contains exactly 6 strings; prefix matching via `startsWith()` covers nested routes. The middleware sets `user = null` when Supabase is unconfigured, so auth-gating tests pass without a real Supabase connection.
- `/events` is a "coming soon" placeholder that is NOT in `PROTECTED_ROUTES`. Public access is intentional at this point.

## Desired End State

`npm run test` runs vitest and passes all integration tests (Risks #2, #1/#3 state machine). `npm run test:e2e` runs Playwright and passes the end-to-end invitation-loop browser test (Risk #1). No test files leak data between runs. A future `npm run test` in CI requires only Docker (for local Supabase) to be green.

### What proves each risk is protected

| Risk | Concrete assertion |
|------|-------------------|
| #1 | User B's `listReceivedPending` returns the invitation after User A calls `sendInvitation`; after User B calls `respondToInvitation('accepted')`, both `listAcceptedMeetings(clientA)` and `listAcceptedMeetings(clientB)` return exactly 1 row |
| #2 | Unauthenticated `fetch(route, { redirect: 'manual' })` returns HTTP 302 with `Location` containing `/auth/signin` for each of the 6 strings in `PROTECTED_ROUTES` |
| #3 | `listAcceptedMeetings` returns 0 rows while status is `pending`; 0 rows after `declined`; 1 row after `accepted` |

## What We're NOT Doing

- No CI wiring (Phase 4 of the test-plan roadmap handles that)
- No coverage thresholds or coverage reports (defer to Phase 4)
- No Playwright tests for Risk #2 (auth gating tests use vitest + fetch — no browser needed)
- No testing of the Playwright browser automation for Risks #2/#3 (browser adds cost with no extra signal for pure-SDK flows)
- No `/events` route change — it remains public; the test documents this as confirmed behavior, not a gap to fix in this phase
- No breeding-type invitation tests (Risk #7 is Phase 3 of the rollout)
- No RLS or IDOR tests (Risks #4/#5 are Phase 2 of the rollout)

## Implementation Approach

Four sequential phases: bootstrap the runners → auth-gating tests → invitation state machine tests → Playwright e2e. Phases 1 and 2 have no Supabase dependency. Phase 3 requires `npx supabase start`. Phase 4 requires both the dev server and local Supabase.

## Critical Implementation Details

**vitest environment must be `node`**: `@supabase/supabase-js` uses native `fetch` and Node-only APIs. Using `jsdom` or `happy-dom` will break Supabase client initialization.

**globalSetup order**: Phase 2 adds a `globalSetup` to `vitest.config.ts` that spawns the Astro dev server. This process must be fully started (port 4321 responding) before any test in `auth-gating.test.ts` runs. The global-setup module must return a teardown function that kills the spawned process; otherwise the vitest process hangs.

**Service-role client for user creation**: Creating test users via `supabase.auth.admin.createUser()` requires the service-role key (not the anon key). The service-role key for a local `supabase start` instance is deterministic — output of `npx supabase status`. Store it in `.env.test` (add to `.gitignore`); never commit it.

**Test user cleanup**: each test or `afterAll` must delete invitation rows AND call `supabase.auth.admin.deleteUser()` via the service-role client. Skipping this leaves orphaned `auth.users` rows that accumulate across runs.

---

## Phase 1: Bootstrap test infrastructure

### Overview

Install vitest, `@vitest/coverage-v8`, and `@playwright/test`; move `playwright` to devDependencies; create `vitest.config.ts` and `playwright.config.ts`; create the test helpers and directory skeleton. The phase is complete when `npm run test` exits 0 (no test files yet — that is acceptable) and `npm run lint` still passes.

### Changes Required

#### 1. Package dependencies

**File**: `package.json`

**Intent**: Add vitest and Playwright test runner as dev tools; correct the misplaced `playwright` entry so it does not ship to production.

**Contract**: Move `playwright` from `dependencies` to `devDependencies`. Add to `devDependencies`: `"vitest"`, `"@vitest/coverage-v8"`, `"@playwright/test"` (all latest stable). Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`.

#### 2. vitest config

**File**: `vitest.config.ts` (new, project root)

**Intent**: Configure vitest to pick up `tests/**/*.test.ts` in a Node environment. No globalSetup yet — that lands in Phase 2.

**Contract**: Export a `defineConfig` with `test.environment: 'node'`, `test.include: ['tests/**/*.test.ts']`, and `test.exclude: ['tests/e2e/**']`. No alias, no transform needed — vitest handles TypeScript natively.

#### 3. Playwright config

**File**: `playwright.config.ts` (new, project root)

**Intent**: Point Playwright at `tests/e2e/` and configure the local dev server as the baseURL. Phase 4 writes the actual e2e test; this config makes `npx playwright test` runnable without extra flags.

**Contract**: `testDir: 'tests/e2e'`, `use.baseURL: process.env.BASE_URL ?? 'http://localhost:4321'`. Add a `webServer` block: `command: 'npm run dev'`, `url: 'http://localhost:4321'`, `reuseExistingServer: !process.env.CI`. This means Phase 4 tests start the server automatically.

#### 4. Test helpers

**File**: `tests/helpers/supabase.ts` (new)

**Intent**: Provide a single place to build authenticated Supabase clients for tests, so individual test files don't repeat connection setup.

**Contract**: Export three functions:
- `createAnonClient(): SupabaseClient` — builds a client with the anon key; reads `SUPABASE_TEST_URL` and `SUPABASE_TEST_ANON_KEY` from `process.env`, defaulting to `http://127.0.0.1:54321` and the standard local dev anon key (output of `npx supabase status`).
- `createServiceRoleClient(): SupabaseClient` — same URL, reads `SUPABASE_TEST_SERVICE_ROLE_KEY`; used for admin operations (user creation/deletion, direct row teardown).
- `signInTestUser(client: SupabaseClient, email: string, password: string): Promise<SupabaseClient>` — calls `client.auth.signInWithPassword(...)` and returns the same client (session is stored in-memory on the client instance).

#### 5. env.test file note

**File**: `.env.test` (new, gitignored)

**Intent**: Store local Supabase test credentials so test helpers can read them without hardcoding.

**Contract**: Three keys: `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY`. Values come from `npx supabase status` after `npx supabase start`. Add `.env.test` to `.gitignore`. The vitest config loads `.env.test` automatically via vitest's built-in dotenv support (`envFile: '.env.test'` in `vitest.config.ts`).

#### 6. Directory scaffold

**Intent**: Create the expected directory structure so imports work and vitest `include` globs resolve.

**Contract**: Create empty placeholder files: `tests/integration/.gitkeep`, `tests/e2e/.gitkeep`. These can be removed once real test files land.

### Success Criteria

#### Automated Verification

- `npm install` completes with no unresolved peer dependency warnings
- `npm run test` exits 0 (vitest runs, finds 0 test files, does not error)
- `npm run lint` passes — no TypeScript errors in new `vitest.config.ts` / `playwright.config.ts` / `tests/helpers/supabase.ts`
- `npx playwright install --with-deps chromium` exits 0

#### Manual Verification

- `package.json` `dependencies` no longer contains `playwright`; `devDependencies` has `vitest`, `@vitest/coverage-v8`, `@playwright/test`, and `playwright`

---

## Phase 2: Risk #2 — Auth-gating integration tests

### Overview

Write integration tests that assert every route in `PROTECTED_ROUTES` redirects unauthenticated requests to `/auth/signin`. A vitest `globalSetup` starts the Astro dev server (which boots without real Supabase credentials, setting `user = null`).

### Changes Required

#### 1. Global setup for dev server

**File**: `tests/setup/global-setup.ts` (new)

**Intent**: Start the Astro dev server once before all test files run and tear it down after. The auth-gating tests need an HTTP server responding on port 4321; no real Supabase connection is required.

**Contract**: Export a `default` async function that spawns `npm run dev` as a child process, polls `http://localhost:4321` with a 5 s timeout, and returns a teardown function that kills the process. Use `node:child_process.spawn` and `node:http` or `node:fetch` for the readiness poll. If the server does not respond within the timeout, throw an error.

#### 2. vitest config update

**File**: `vitest.config.ts` (update)

**Intent**: Wire the global-setup so the dev server is started before any integration test file runs.

**Contract**: Add `test.globalSetup: ['tests/setup/global-setup.ts']` and `test.envFile: '.env.test'` to the existing config.

#### 3. Auth-gating test

**File**: `tests/integration/auth-gating.test.ts` (new)

**Intent**: Assert that each of the 6 routes in `PROTECTED_ROUTES` redirects an unauthenticated request to `/auth/signin`, and document `/events` as a confirmed public route.

**Contract**: Six `it` blocks — one per route: `/dashboard`, `/profile`, `/dogs`, `/owners`, `/invitations`, `/meetings`. Each does `fetch('http://localhost:4321<route>', { redirect: 'manual' })` and asserts: status is `301` or `302`; the `Location` header includes `/auth/signin`. One additional `it` block titled `"GET /events is publicly accessible (intentional — placeholder page)"` asserts status `200` or a non-redirect response. Import `PROTECTED_ROUTES` directly from `src/middleware.ts` so the test list stays in sync automatically if the array changes.

### Success Criteria

#### Automated Verification

- `npm run test` — `auth-gating.test.ts`: 7 tests pass (6 redirect assertions + 1 /events public confirmation)
- `npm run lint` passes

#### Manual Verification

- Review test output and confirm each test message names the route being asserted (e.g., `"GET /owners redirects unauthenticated user to /auth/signin"`)
- Confirm the `/events` test comment explains it is intentionally public

---

## Phase 3: Risks #1 + #3 — Invitation state machine

### Overview

Write SDK-level integration tests covering the full invitation → meeting transition (Risk #1) and the state-machine guard that keeps pending/declined invitations out of the meetings tab (Risk #3). No HTTP server is required; tests call `src/lib/services/invitation.ts` functions directly with authenticated Supabase clients.

### Changes Required

#### 1. Test user utilities

**File**: `tests/helpers/supabase.ts` (update)

**Intent**: Add helpers for creating and cleaning up ephemeral test users so each test starts with a clean state.

**Contract**: Export two new functions:
- `createTestUser(serviceClient: SupabaseClient, email: string, password: string): Promise<{ user: User; client: SupabaseClient }>` — calls `serviceClient.auth.admin.createUser({ email, password, email_confirm: true })` to bypass email confirmation, then calls `signInTestUser` to return an authenticated anon client for that user.
- `deleteTestUser(serviceClient: SupabaseClient, userId: string): Promise<void>` — calls `serviceClient.auth.admin.deleteUser(userId)` and `serviceClient.from('invitations').delete().or('sender_id.eq.${userId},receiver_id.eq.${userId}')` for cleanup.

#### 2. Invitation state machine test

**File**: `tests/integration/invitation-state-machine.test.ts` (new)

**Intent**: Prove four scenarios against a real local Supabase instance: inbox delivery, pending exclusion from meetings, declined exclusion from meetings, and both-parties visibility after acceptance.

**Contract**: Use `beforeAll` to create two test users (User A and User B) via the service-role client and `createTestUser`. Use `afterAll` to call `deleteTestUser` for both. Four `it` blocks:

1. **"User B sees User A's invitation in inbox"** — User A calls `sendInvitation(clientA, userA.id, userB.id, 'walk')`; assert `listReceivedPending(clientB, userB.id)` returns an array of length 1 containing the sent invitation.

2. **"Meetings tab shows 0 rows while invitation is pending"** — (continuing from the seeded row) assert `listAcceptedMeetings(clientA, userA.id)` returns length 0; assert `listAcceptedMeetings(clientB, userB.id)` returns length 0.

3. **"Meetings tab shows 0 rows after declining"** — User B calls `respondToInvitation(clientB, userB.id, invitationId, 'declined')`; assert both `listAcceptedMeetings(clientA)` and `listAcceptedMeetings(clientB)` return length 0.

4. **"Both parties see exactly 1 meeting after accepting"** — (using a fresh invitation created in this `it`) User A calls `sendInvitation`; User B calls `respondToInvitation('accepted')`; assert `listAcceptedMeetings(clientA, userA.id)` returns length 1; assert `listAcceptedMeetings(clientB, userB.id)` returns length 1; assert both returned rows have the same `id`.

Import service functions directly: `import { sendInvitation, respondToInvitation, listReceivedPending, listAcceptedMeetings } from '@/lib/services/invitation'`.

### Success Criteria

#### Automated Verification

- `npm run test` — `invitation-state-machine.test.ts`: 4 tests pass
- All tests pass with a freshly reset local DB (`npx supabase db reset`) to confirm no dependency on prior state
- `npm run lint` passes

#### Manual Verification

- After a test run, verify no orphaned rows remain: `npx supabase db psql -c "SELECT count(*) FROM invitations"` returns 0 (or only rows from non-test data)

---

## Phase 4: Risk #1 — Playwright e2e invitation loop

### Overview

Write a browser-driven end-to-end test using two separate browser contexts to prove the invitation loop works through the real UI: User A sends an invitation, User B sees it in the Zaproszenia tab, User B accepts, and both parties see the meeting in the Nadchodzące tab.

### Changes Required

#### 1. Playwright global setup for test users

**File**: `tests/setup/playwright-global-setup.ts` (new)

**Intent**: Seed two named test accounts in the local Supabase instance before Playwright tests run, so the browser tests have stable credentials to sign in with.

**Contract**: Create (or re-create) two Supabase users via the service-role client: `e2e-user-a@test.local` / `e2e-user-b@test.local` with a fixed test password. Write their UUIDs to a `tests/setup/.e2e-users.json` temp file for the test to read. Use `email_confirm: true` to skip confirmation flow.

#### 2. Playwright config update

**File**: `playwright.config.ts` (update)

**Intent**: Wire the global-setup and add a `test:e2e` script pointing to Playwright.

**Contract**: Add `globalSetup: 'tests/setup/playwright-global-setup.ts'` to `playwright.config.ts`. The existing `webServer` block (from Phase 1) already handles starting the dev server.

#### 3. Package scripts update

**File**: `package.json` (update)

**Intent**: Add the e2e script.

**Contract**: Add `"test:e2e": "playwright test"` to `scripts`.

#### 4. Invitation loop e2e test

**File**: `tests/e2e/invitation-loop.spec.ts` (new)

**Intent**: Browser-level proof of Risk #1 — User B receives User A's invitation in their inbox, can accept it, and both parties then see the meeting.

**Contract**: Single `test` block using `browser.newContext()` twice (one context per user). Step sequence:
1. User A signs in at `/auth/signin`; navigates to `/owners`; finds User B's profile card; clicks the "Zaproś na spacer" (or equivalent invite) button to send a walk invitation to User B.
2. User B signs in in the second context; navigates to `/invitations` (or `/meetings` Zaproszenia tab); asserts the invitation from User A is visible.
3. User B clicks "Akceptuj" (accept); asserts the meeting appears in the Nadchodzące tab.
4. Switch back to User A's context; navigate to `/meetings`; assert the same meeting appears in User A's Nadchodzące tab.

Read User A/B email and UUID from `tests/setup/.e2e-users.json`. Use `page.waitForURL` and `page.getByRole` / `page.getByText` — avoid brittle CSS selectors.

### Success Criteria

#### Automated Verification

- `npm run test:e2e` — `invitation-loop.spec.ts`: 1 test passes
- `npm run lint` passes

#### Manual Verification

- `npm run test:e2e -- --headed` — watch the full two-user browser flow run end-to-end visually at least once to confirm the correct UI elements are being targeted

---

## Testing Strategy

### Integration tests (vitest)

Covers Risks #2, #1, and #3 via direct SDK calls and HTTP fetch; no browser overhead. All four scenarios in `invitation-state-machine.test.ts` are independent (each creates its own invitation rows) and can run in any order.

### End-to-end test (Playwright)

Covers Risk #1 through the real browser + cookie session. Runs separately from vitest via `npm run test:e2e`. Requires `npx supabase start` and the dev server.

### Not in scope for this phase

Unit tests for individual helper functions; coverage reports; RLS policy tests (Phase 2 rollout).

---

## Migration Notes

No DB schema changes in this phase. All new tables/columns were created in prior slices. `npx supabase db reset` applies all five existing migrations to a clean local DB before each test run in CI.

---

## References

- Research: `context/changes/testing-bootstrap-critical-path/research.md`
- Test plan: `context/foundation/test-plan.md` — §3 Phase 1, §4 stack, §5 quality gates
- Invitation service: `src/lib/services/invitation.ts`
- Middleware: `src/middleware.ts:5` (PROTECTED_ROUTES)
- Migration: `supabase/migrations/20260926090001_create_invitations.sql`
- Supabase local config: `supabase/config.toml` (API port 54321, DB port 54322)

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Bootstrap test infrastructure

#### Automated

- [x] 1.1 npm install completes with no unresolved peer dependency warnings
- [x] 1.2 npm run test exits 0 (vitest finds 0 test files, does not error)
- [x] 1.3 npm run lint passes — no TypeScript errors in vitest.config.ts, playwright.config.ts, tests/helpers/supabase.ts
- [x] 1.4 npx playwright install --with-deps chromium exits 0

#### Manual

- [x] 1.5 package.json dependencies no longer contains playwright; devDependencies has vitest, @vitest/coverage-v8, @playwright/test, and playwright

### Phase 2: Risk #2 — Auth-gating integration tests

#### Automated

- [ ] 2.1 npm run test — auth-gating.test.ts: 7 tests pass (6 redirect + 1 /events public)
- [ ] 2.2 npm run lint passes

#### Manual

- [ ] 2.3 Test output message names the route being asserted for each of the 6 protected routes
- [ ] 2.4 /events test comment explains it is intentionally public

### Phase 3: Risks #1 + #3 — Invitation state machine

#### Automated

- [ ] 3.1 npm run test — invitation-state-machine.test.ts: 4 tests pass
- [ ] 3.2 All 4 tests pass after npx supabase db reset (no hidden dependency on prior state)
- [ ] 3.3 npm run lint passes

#### Manual

- [ ] 3.4 After test run: npx supabase db psql -c "SELECT count(*) FROM invitations" returns 0 (no leaked rows)

### Phase 4: Risk #1 — Playwright e2e invitation loop

#### Automated

- [ ] 4.1 npm run test:e2e — invitation-loop.spec.ts: 1 test passes
- [ ] 4.2 npm run lint passes

#### Manual

- [ ] 4.3 npm run test:e2e -- --headed: full two-user browser flow completes visually end-to-end
