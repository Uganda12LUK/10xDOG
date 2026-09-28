---
date: 2026-09-28T00:00:00+00:00
researcher: Claude (claude-sonnet-4-6)
git_commit: 45ad62a42f2f5e629f9dd93a5bf28607d6eee0b4
branch: main
repository: Lekcja_1_DOGFB
topic: "Phase 1 integration test bootstrap — invitation loop, auth gating, meeting state machine"
tags: [research, codebase, invitations, middleware, meetings, vitest, supabase]
status: complete
last_updated: 2026-09-28
last_updated_by: Claude (claude-sonnet-4-6)
---

# Research: Phase 1 Integration Test Bootstrap

**Date**: 2026-09-28  
**Researcher**: Claude (claude-sonnet-4-6)  
**Git Commit**: 45ad62a42f2f5e629f9dd93a5bf28607d6eee0b4  
**Branch**: main  
**Repository**: Lekcja_1_DOGFB

---

## Research Question

What code paths and DB structures must integration tests exercise for Phase 1 (Risks #1, #2, #3), and what does the test infrastructure bootstrap require?

Three sub-questions:
1. **Risk #1** — How does the invitation loop work end-to-end so tests can prove User B receives and acts on User A's invitation, and the meeting appears for both parties afterward?
2. **Risk #2** — What is the exact set of protected routes, and are any existing page routes missing from it?
3. **Risk #3** — What filter does the meetings query use, and does it correctly exclude pending/declined invitations?
4. **Bootstrap** — What needs to be installed/configured before any of the above tests can run?

---

## Summary

**Risk #1 (invitation loop):** The loop is driven entirely through the `invitations` table — there is no separate `meetings` table. The service layer is clean: `sendInvitation` inserts with `status='pending'`; `respondToInvitation` updates to `'accepted'` or `'declined'`; `listAcceptedMeetings` returns rows where `status = 'accepted'` AND the current user is either sender or receiver. The inbox (`listReceivedPending`) filters `receiver_id = userId AND status = 'pending'`. An integration test can drive the full two-user scenario against a real local Supabase instance.

**Risk #2 (auth gating):** `PROTECTED_ROUTES` at `src/middleware.ts:5` contains exactly these 6 strings: `"/dashboard"`, `"/profile"`, `"/dogs"`, `"/owners"`, `"/invitations"`, `"/meetings"`. The middleware uses `pathname.startsWith(route)`, so nested routes (e.g. `/dogs/new`, `/owners/[id]`) are covered by prefix match. One page route, `/events`, is not in the list — the page is a "coming soon" placeholder and public access appears intentional, but this should be explicitly confirmed in the test. All mutation API routes under `/api/` perform their own user-check independently of middleware.

**Risk #3 (state machine):** `listAcceptedMeetings` (`src/lib/services/invitation.ts:105-118`) filters on exactly `status = 'accepted'`. A pending invitation will not appear (its status is `'pending'`). A declined invitation will not appear (its status is `'declined'`). The DB migration enforces the constraint that status can only be one of `('pending', 'accepted', 'declined')` and cannot transition back to `'pending'` once changed (`20260926090002_restrict_invitation_status_update.sql:15-17`).

**Bootstrap:** vitest is not installed. No test scripts exist. No test files exist. No vitest config exists. Playwright binary (`^1.49.0`) is listed in `dependencies` (not devDependencies) but `@playwright/test` is not installed. `@supabase/supabase-js` (`^2.99.1`) is already available. `supabase` CLI (`^2.23.4`) is in devDependencies with `supabase/config.toml` and local DB on port 54322 ready.

---

## Detailed Findings

### A. Invitation Create (Risk #1)

- **API route**: `src/pages/api/invitations/index.ts:13-54` — POST handler
- **Caller identity**: read from session via `supabase.auth.getUser()` at line 26; the form body supplies `receiver_id` (UUID) and `type` (enum `'walk' | 'breeding'`); `sender_id` is never trusted from the form body
- **Service call**: `sendInvitation(supabase, user.id, receiver_id, type)` at `src/lib/services/invitation.ts:27-43`
- **DB insert**: `.insert({ sender_id, receiver_id, type })` — the `status` column is not explicitly set; the DB default `'pending'` applies (`supabase/migrations/20260926090001_create_invitations.sql:9`)
- **Table**: `invitations` — no separate meetings table exists anywhere in the codebase

### B. Invitation Respond (Risk #1, #3)

Two API routes both delegate to the same service function:

- **JSON endpoint**: `src/pages/api/invitations/respond.ts:13-62` — body: `invitationId` (UUID) + `action` (`"accepted" | "declined"`)
- **Form endpoint**: `src/pages/api/invitations/[id].ts:12-49` — form field `_action` (`"accept" | "decline"`), mapped to `"accepted"/"declined"` at line 40
- **Service**: `respondToInvitation(supabase, userId, invitationId, response)` at `src/lib/services/invitation.ts:120-138`
- **DB update**: `.update({ status: response }).eq("receiver_id", userId)` at lines 126-132 — only the receiver can change status; the `.eq("receiver_id", userId)` constraint in the query enforces this at the application layer, and the RLS policy in the migration enforces it at the DB layer
- **Trigger guard**: `supabase/migrations/20260926090002_restrict_invitation_status_update.sql:15-17` — DB trigger rejects any status update that would write `'pending'`; only `'accepted'` and `'declined'` are permitted transitions

### C. Invitation Inbox (Risk #1)

- **Service**: `listReceivedPending(client, userId)` at `src/lib/services/invitation.ts:64-76`
- **Query**: `.from("invitations").select("*").eq("receiver_id", userId).eq("status", "pending").order("created_at", { ascending: false })`
- **Called from**: `src/pages/invitations/index.astro:18`
- The query returns all columns; the inbox is rendered in `src/components/meetings/MeetingsView.tsx:181-190` ("Zaproszenia" tab) with accept/decline buttons

### D. Meetings Tab Query (Risk #3)

- **Service**: `listAcceptedMeetings(client, userId)` at `src/lib/services/invitation.ts:105-118`
- **Query**: `.from("invitations").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted").order("updated_at", { ascending: false })`
- **Status filter**: exactly `status = 'accepted'` at line 111 — one equality check, no range, no exclusion set
- **Participation filter**: bidirectional OR — the user must be either sender or receiver; this means after User A sends and User B accepts, both parties see the row
- **Called from**: `src/pages/meetings/index.astro:22`
- A `pending` invitation has `status = 'pending'` and will not pass the `= 'accepted'` filter. A `declined` invitation has `status = 'declined'` and will not pass either. This satisfies Risk #3's protection condition.

### E. DB Schema (Risks #1, #3, #5)

Source: `supabase/migrations/20260926090001_create_invitations.sql`

| Column | Type | Constraint |
|--------|------|-----------|
| `id` | UUID | PK, auto-generated |
| `sender_id` | UUID | FK → `auth.users` ON DELETE CASCADE |
| `receiver_id` | UUID | FK → `auth.users` ON DELETE CASCADE |
| `type` | text | CHECK: `type IN ('walk', 'breeding')` |
| `status` | text | DEFAULT `'pending'`; CHECK: `status IN ('pending', 'accepted', 'declined')` |
| `created_at` | timestamptz | DEFAULT `now()` |
| `updated_at` | timestamptz | DEFAULT `now()`, updated by trigger |

- **Self-invite guard**: CHECK `sender_id <> receiver_id` — DB-enforced
- **Duplicate pending guard**: partial unique index `invitations_no_duplicate_pending` on `(sender_id, receiver_id, type) WHERE status = 'pending'` — prevents more than one pending invitation per direction/type pair
- **Immutable fields trigger**: `20260926090002_restrict_invitation_status_update.sql:10-14` — `id`, `sender_id`, `receiver_id`, `type`, `created_at` cannot change after insert

### F. PROTECTED_ROUTES and Auth Middleware (Risk #2)

- **Definition**: `src/middleware.ts:5` — `const PROTECTED_ROUTES = ["/dashboard", "/profile", "/dogs", "/owners", "/invitations", "/meetings"]` — exactly 6 strings
- **Match logic**: `pathname.startsWith(route)` at line 19-26 — prefix matching; `/dogs/new`, `/dogs/[id]`, `/owners/[id]` are all covered without being separately listed
- **Redirect**: `context.redirect("/auth/signin")` at line 24, triggered when `isProtected && !context.locals.user`
- **Unconfigured Supabase**: when the client cannot be initialized, `context.locals.user = null` is set and the middleware continues; protected routes still redirect to `/auth/signin`
- **`/events` gap**: `src/pages/events/index.astro` renders a "coming soon" placeholder and is not in `PROTECTED_ROUTES`. Current behavior allows unauthenticated access. Whether this is intentional should be confirmed; the test should document the observed behavior rather than assert a redirect for this route.

**All existing page routes vs. PROTECTED_ROUTES:**

| Route | Protected? | Notes |
|-------|-----------|-------|
| `/` | No | Public landing; middleware redirects logged-in users to `/dashboard` |
| `/dashboard` | Yes | In list |
| `/profile` | Yes | In list |
| `/dogs`, `/dogs/new`, `/dogs/[id]` | Yes | Covered by `/dogs` prefix |
| `/owners`, `/owners/[id]` | Yes | Covered by `/owners` prefix |
| `/invitations` | Yes | In list |
| `/meetings` | Yes | In list |
| `/events` | **No** | Placeholder page; not in list |
| `/auth/signin`, `/auth/signup`, `/auth/confirm-email` | No | Intentionally public |

### G. Test Infrastructure Bootstrap

Source: `package.json` (inspected by worker 3 at commit 45ad62a).

| Item | Status | Detail |
|------|--------|--------|
| `vitest` | **Missing** | Not in `dependencies` or `devDependencies` |
| `@vitest/coverage-v8` | **Missing** | Not installed |
| `@playwright/test` | **Missing** | Not installed; `playwright` binary `^1.49.0` is in `dependencies` (not devDependencies) — anomaly worth fixing |
| `@supabase/supabase-js` | Present | `^2.99.1` in `dependencies` |
| `supabase` CLI | Present | `^2.23.4` in `devDependencies` |
| `vitest.config.ts` | **Missing** | No config file in project root |
| Test scripts | **Missing** | No `test`, `test:*`, `vitest` entries in `scripts` |
| Test files | **Missing** | Zero `*.test.ts` / `*.spec.ts` files in `src/` or any top-level `tests/` directory |
| `supabase/config.toml` | Present | Local DB on port 54322, project ID `10x-astro-starter` |
| `supabase/migrations/` | Present | 5 migrations; first: `20260923090001_create_profiles.sql` |

**What bootstrap must deliver:**
1. Install `vitest` + `@vitest/coverage-v8` (devDependencies)
2. Create `vitest.config.ts` — must configure the Node environment (not browser/jsdom) since tests call Supabase JS SDK and Node fetch
3. Add `"test": "vitest run"` (and optionally `"test:watch": "vitest"`) to `package.json scripts`
4. Decide on test DB strategy: `npx supabase start` (local Docker) vs. a remote test project. Local is the safer default for CI isolation; the `supabase` CLI is already in devDeps.
5. Create a test helper that initializes a Supabase client pointing at the local DB (URL: `http://localhost:54321`, anon key from `supabase status`) and a service-role client for seeding/teardown
6. Move `playwright` from `dependencies` to `devDependencies` (it is a dev tool, not a production runtime dep)

---

## Code References

- `src/middleware.ts:5` — `PROTECTED_ROUTES` array definition (6 strings)
- `src/middleware.ts:19-26` — `startsWith` prefix matching + redirect logic
- `src/pages/api/invitations/index.ts:13-54` — POST create-invitation handler
- `src/pages/api/invitations/respond.ts:13-62` — POST respond (JSON body) handler
- `src/pages/api/invitations/[id].ts:12-49` — POST respond (form body) handler
- `src/lib/services/invitation.ts:27-43` — `sendInvitation` service function
- `src/lib/services/invitation.ts:64-76` — `listReceivedPending` — inbox query
- `src/lib/services/invitation.ts:78-90` — `listSentPending` — sent-proposals query
- `src/lib/services/invitation.ts:105-118` — `listAcceptedMeetings` — meetings tab query (filters `status = 'accepted'`)
- `src/lib/services/invitation.ts:120-138` — `respondToInvitation` — status update
- `src/pages/invitations/index.astro:18` — calls `listReceivedPending`
- `src/pages/meetings/index.astro:22` — calls `listAcceptedMeetings`
- `src/components/meetings/MeetingsView.tsx:121-196` — tab rendering (Nadchodzące / Propozycje / Zaproszenia / Historia)
- `supabase/migrations/20260926090001_create_invitations.sql` — full table schema, constraints, partial unique index, RLS policies
- `supabase/migrations/20260926090002_restrict_invitation_status_update.sql:15-17` — trigger: status cannot be set back to `'pending'`

---

## Architecture Insights

1. **No separate meetings entity.** Confirmed meetings are fully represented by `invitations WHERE status = 'accepted'`. An integration test that inserts an invitation row and updates its status to `'accepted'` will make it appear in the meetings tab with no further steps.

2. **Bidirectional meetings query.** `listAcceptedMeetings` uses an OR (`sender_id = userId OR receiver_id = userId`), so both User A (sender) and User B (receiver) see the same row after acceptance. A test proving Risk #1 only needs one DB row and two Supabase client instances (one per user) to assert visibility for both parties.

3. **Session identity is always read server-side.** Every mutation API route calls `supabase.auth.getUser()` directly from the session cookie — the caller's identity is never taken from the form/body. Integration tests must authenticate a user against the local Supabase instance and obtain a valid session token to exercise these routes realistically.

4. **Middleware prefix matching has one observable gap.** `/events` exists as a page but is not in `PROTECTED_ROUTES`. It currently renders a placeholder. The test for Risk #2 should enumerate the 6 protected routes from the observed list and separately note `/events` as a confirmed public route — not an implicit failure.

5. **`playwright` in wrong dep group.** Listed in `dependencies` rather than `devDependencies`. This means it will be bundled in production installs. Should be moved when bootstrap is done.

---

## Historical Context

- `context/archive/walk-invitation-loop/` — prior implementation slice covering the invitation send/receive/respond cycle; confirms the `invitations` table schema and RLS approach established there are what the current code uses (partial unique index and self-invite CHECK cited in risk map are present in migration as expected)
- `context/archive/ui-meetings-tabs/` — S-05 slice that wired `listAcceptedMeetings` and the MeetingsView component; confirms the query filter observed in code matches the intended design

---

## Related Research

No prior `research.md` artifacts exist for this change folder or for any Phase 1 test-related folder.

---

## Open Questions

1. **Test DB strategy decision** — local `supabase start` (requires Docker in CI) vs. a dedicated remote test Supabase project. The plan phase should resolve this; both are viable. The local approach is recommended because migrations are already in `supabase/migrations/` and the CLI is installed.

2. **`/events` protection intent** — the page is a "coming soon" placeholder and currently publicly accessible. Risk #2's test should document this as observed behavior; a separate decision is needed if it should become protected before or after Phase 1 ships.

3. **`playwright` dependency placement** — listed in `dependencies` rather than `devDependencies`. Moving it is a cosmetic fix with no correctness impact but should be included in bootstrap to avoid deploying the binary to production.
