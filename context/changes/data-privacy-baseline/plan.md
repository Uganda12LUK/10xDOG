# Data-Privacy Baseline — Implementation Plan

## Overview

Retroactively formalize the data-privacy foundation (F-01) whose implementation
landed inside S-01/S-02. The migration workflow is already running, RLS is already
applied, and the auth middleware already gates protected routes. This plan audits
that existing work for correctness, creates seed data for local development, and
documents the load-bearing patterns as a stable reference for all future slices.

## Current State Analysis

S-01 and S-02 delivered the concrete work before F-01 was formally planned:

- **Migrations** — three files in `supabase/migrations/`:
  - `20260923090001_create_profiles.sql` — profiles table + granular RLS
  - `20260923090002_create_avatars_bucket.sql` — avatars storage bucket + RLS
  - `20260924090001_create_dogs.sql` — dogs table + granular RLS
- **Middleware** — `src/middleware.ts:5` defines `PROTECTED_ROUTES = ["/dashboard", "/profile", "/dogs"]`; unauthenticated requests to those prefixes redirect to `/auth/signin`
- **API routes** — each endpoint under `src/pages/api/` performs an inline `supabase.auth.getUser()` check

**Missing:**
- No `supabase/seed.sql` (referenced in `supabase/config.toml:60` but absent)
- No `docs/reference/contract-surfaces.md` (referenced in CLAUDE.md as the load-bearing names registry)

### Key Discoveries

- `src/middleware.ts:8` returns `null` when env vars are absent and still redirects
  unauthenticated users correctly — the null-guard is present and safe
- `profiles_select_authenticated` (line 34 of profiles migration) allows any
  authenticated user to read all profiles — correct for the discovery feature
- `dogs_delete_own` (line 53 of dogs migration) exists; profiles intentionally
  has no delete policy (comment on line 55 of profiles migration)
- `dogs.birthdate` is `date` type (not `text`) — seed SQL must use ISO date literals

## Desired End State

- All three existing migrations are confirmed correct and consistent with the
  granular-RLS convention
- `src/middleware.ts` PROTECTED_ROUTES confirmed to cover all currently deployed pages
- `supabase/seed.sql` exists with 2 fake users, profiles, and dogs — `npx supabase db reset` succeeds locally
- `docs/reference/contract-surfaces.md` documents the RLS naming convention,
  PROTECTED_ROUTES pattern, and migration naming so future slices have a canonical
  reference without re-reading the code

## What We're NOT Doing

- Adding future slice routes (`/owners`, `/meetings`) to PROTECTED_ROUTES — each slice adds its own
- Automated RLS smoke tests in CI — manual browser verification is sufficient for this foundation
- Any schema changes — tables, columns, and indexes are correct as-is
- Authentication changes — email/password auth via Supabase is already working

## Implementation Approach

All three phases are independent of each other after Phase 1's audit gate; Phase 1
is first because it may surface a gap that changes Phase 2 or 3 scope. Phases 2
and 3 create new files with no dependencies on each other.

---

## Phase 1: Audit & Verify

### Overview

Read each migration and the middleware; confirm RLS policies match the declared
convention and PROTECTED_ROUTES cover all currently deployed pages. No code
changes expected — this phase is a gate before creating reference artifacts.

### Changes Required

#### 1. Migration audit

**Files**: `supabase/migrations/20260923090001_create_profiles.sql`,
`supabase/migrations/20260923090002_create_avatars_bucket.sql`,
`supabase/migrations/20260924090001_create_dogs.sql`

**Intent**: Confirm each migration enables RLS and applies policies covering all
four operations (SELECT/INSERT/UPDATE/DELETE) for the appropriate roles, with no
unintended `anon` access.

**Contract**: Each table must have `enable row level security` and at minimum a
`_select_authenticated` policy (role `authenticated`, USING `true`); INSERT/UPDATE
must use `auth.uid()` equality on the owner column; DELETE present on dogs, absent
on profiles (intentional). Storage bucket `avatars` must check folder ownership in
INSERT/UPDATE via `storage.foldername(name)[1] = auth.uid()::text`.

#### 2. Middleware audit

**File**: `src/middleware.ts`

**Intent**: Confirm `PROTECTED_ROUTES` covers every non-auth page currently
deployed and that the null-guard around the Supabase client cannot let an
unauthenticated request through.

**Contract**: `PROTECTED_ROUTES` must include `/dashboard`, `/profile`, `/dogs`.
The null-client path (`supabase = null`) must set `context.locals.user = null`,
which the route-protection block then catches and redirects.

### Success Criteria

#### Automated Verification

- `npm run lint` passes with no new errors
- `npm run build` passes (no TypeScript errors in middleware or services)

#### Manual Verification

- Sign out of the app; navigate directly to `/profile` — browser redirects to `/auth/signin`
- Sign out; navigate to `/dogs` — browser redirects to `/auth/signin`
- Supabase dashboard (Table Editor → `profiles`) shows "RLS enabled" badge
- Supabase dashboard (Table Editor → `dogs`) shows "RLS enabled" badge

**Implementation Note**: After completing this phase and manual verification,
confirm before proceeding to Phase 2.

---

## Phase 2: Seed File

### Overview

Create `supabase/seed.sql` with two fake users, matching profiles, and two dogs
(both Labrador Retriever to enable S-07 list testing). The file is referenced by
`supabase/config.toml:60` and must not contain real credentials or data.

### Changes Required

#### 1. supabase/seed.sql

**File**: `supabase/seed.sql`

**Intent**: Provide local-dev test data so S-03+ list views have content without
manual entry. Two owners in Warsaw with one dog each (same breed) supports both
walk-discovery and breeding-discovery list testing.

**Contract**: Insert two rows into `auth.users` (with stable UUIDs starting
`00000000-0000-0000-0000-00000000000{1,2}`, email confirmed, role `authenticated`),
two corresponding `profiles` rows, and two `dogs` rows with `breed = 'Labrador Retriever'`
and ISO date literals for `birthdate`. File must begin with a comment marking it
as dev-only. Use `on conflict do nothing` guards so repeated resets are idempotent.

```sql
-- seed.sql: local-dev test data only. NOT for production.

insert into auth.users (id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com',
   crypt('devpassword', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com',
   crypt('devpassword', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;
```

*(Profiles and dogs inserts follow the same pattern with the stable UUIDs above.)*

### Success Criteria

#### Automated Verification

- `npx supabase db reset` completes without errors (local Supabase instance)

#### Manual Verification

- After reset, Supabase Table Editor shows 2 rows in `profiles` and 2 rows in `dogs`
- Running `npm run dev` and signing in as `alice@example.com` / `devpassword` reaches `/dashboard`

**Implementation Note**: This phase requires Docker + local Supabase running
(`npx supabase start`). If unavailable, verify the SQL syntax is correct and
skip the `db reset` check; manual verification can be done on next available
local environment.

---

## Phase 3: Contract Surfaces Doc

### Overview

Create `docs/reference/contract-surfaces.md` documenting the three load-bearing
patterns that all future slices depend on: the RLS naming convention, the
PROTECTED_ROUTES extension pattern, and the migration naming format.

### Changes Required

#### 1. docs/reference/contract-surfaces.md

**File**: `docs/reference/contract-surfaces.md`

**Intent**: Give future slices a single authoritative reference for the patterns
established in F-01 so they don't diverge silently.

**Contract**: Document must cover:
1. **RLS naming convention** — `<table>_select_authenticated`, `<table>_insert_own`,
   `<table>_update_own`, `<table>_delete_own` with the exact policy bodies
2. **PROTECTED_ROUTES pattern** — where to add new prefixes (`src/middleware.ts:5`),
   the rule that each slice adds its own route
3. **Migration naming** — `YYYYMMDDHHmmss_short_description.sql`; must always
   enable RLS and follow the granular-policy convention
4. **Ownership column convention** — profiles use `id` (user IS the row); dogs use
   `owner_id` (user owns the row); future tables choose one and state it

### Success Criteria

#### Automated Verification

- `npm run lint` and `npm run build` pass (no source changes, but confirms nothing is broken)

#### Manual Verification

- `docs/reference/contract-surfaces.md` exists and covers all four points above
- A future slice author can read it in under 5 minutes and know exactly what RLS
  policies to write without referencing any migration file directly

---

## Testing Strategy

### Manual Testing Steps

1. **Phase 1**: Sign out → visit `/profile` → confirm redirect to `/auth/signin`
2. **Phase 1**: Supabase dashboard → confirm RLS badges on `profiles` and `dogs`
3. **Phase 2**: `npx supabase db reset` → sign in as seed user → reach dashboard
4. **Phase 3**: Review `docs/reference/contract-surfaces.md` for completeness

## References

- Roadmap item: `context/foundation/roadmap.md` (F-01, lines 77–89)
- PRD guardrails: `context/foundation/prd.md` (NFR: Prywatność, lines 93–96; Bezpieczeństwo dostępu, line 96)
- Profiles migration: `supabase/migrations/20260923090001_create_profiles.sql`
- Dogs migration: `supabase/migrations/20260924090001_create_dogs.sql`
- Avatars migration: `supabase/migrations/20260923090002_create_avatars_bucket.sql`
- Middleware: `src/middleware.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Audit & Verify

#### Automated

- [x] 1.1 npm run lint passes
- [x] 1.2 npm run build passes

#### Manual

- [ ] 1.3 Sign out → /profile redirects to /auth/signin
- [ ] 1.4 Sign out → /dogs redirects to /auth/signin
- [ ] 1.5 Supabase dashboard shows RLS enabled on profiles table
- [ ] 1.6 Supabase dashboard shows RLS enabled on dogs table

### Phase 2: Seed File

#### Automated

- [ ] 2.1 npx supabase db reset completes without errors

#### Manual

- [ ] 2.2 Profiles table shows 2 seed rows after reset
- [ ] 2.3 Dogs table shows 2 seed rows after reset
- [ ] 2.4 Sign in as alice@example.com / devpassword reaches /dashboard

> `supabase/seed.sql` created — 2 users (alice/bob), 2 profiles, 2 Labrador dogs.

### Phase 3: Contract Surfaces Doc

#### Automated

- [x] 3.1 npm run lint passes
- [x] 3.2 npm run build passes

#### Manual

- [x] 3.3 docs/reference/contract-surfaces.md covers RLS naming, PROTECTED_ROUTES, migration naming, ownership column convention
