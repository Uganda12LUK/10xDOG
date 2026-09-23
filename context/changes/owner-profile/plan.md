# Owner Profile (S-01) Implementation Plan

## Overview

Implement the **owner-profile** slice (PRD FR-002 / US-01): a logged-in user can create and edit their owner profile — name, photo, and district/city. This is the first user-visible slice of Stream A and it front-loads the minimal data/privacy foundation (the absorbed F-01) so the slice is shippable on its own.

## Current State Analysis

- **Auth is live and reusable.** `src/lib/supabase.ts` exposes `createClient(headers, cookies)` (returns `null` when `SUPABASE_URL`/`SUPABASE_KEY` are unset); `src/middleware.ts` resolves `context.locals.user` on every request and redirects unauthenticated users away from `PROTECTED_ROUTES` (currently only `/dashboard`).
- **API pattern established.** `src/pages/api/auth/{signin,signup,signout}.ts` export uppercase handlers, read `formData`, and redirect back with `?error=<msg>` on failure. They do not yet use zod, but CLAUDE.md requires zod validation for new API routes.
- **Form pattern established.** React islands mounted `client:load` (`src/components/auth/SignUpForm.tsx`) using `FormField` / `SubmitButton` / `ServerError`, with client-side validation and server errors surfaced via a query param.
- **No data layer yet.** `supabase/` contains only `config.toml` — no `supabase/migrations/` directory, no domain tables, no RLS policies, no Storage buckets. This is the F-01 gap.
- **No shared types file.** `src/types.ts` does not exist yet (CLAUDE.md designates it for shared entities/DTOs).
- **No test runner.** Package scripts are `dev`, `build`, `lint`, `format`, `smoke` only. Type-checking happens via `astro build` (and ESLint's type-checked rules); there is no `vitest`/`jest`. Automated verification relies on `npm run lint`, `npm run build`, local Supabase migration apply, and `npm run smoke`.

### Key Discoveries:

- `src/middleware.ts:4` — `PROTECTED_ROUTES = ["/dashboard"]`; add `/profile` here for gating.
- `src/lib/supabase.ts:5` — `createClient` returns `null` when unconfigured; every new endpoint/page must handle the null client the same way auth routes do.
- `src/pages/api/auth/signup.ts:1-20` — canonical endpoint shape (formData → supabase call → redirect with `?error=`); the profile endpoint follows this but adds zod validation.
- `src/env.d.ts:1-5` — `App.Locals.user` is `User | null`; no change needed, profile is fetched on demand.
- `context/foundation/tech-stack.md:24` — Supabase file storage is the sanctioned path for owner/dog image uploads (FR-002/FR-003).

## Desired End State

A logged-in user visiting `/profile` sees a form pre-filled with their existing profile (or empty on first visit). They can enter/edit name, district, city, and upload a photo; saving persists to a `profiles` row (one per user) and the photo to a Supabase Storage bucket. After login, a user with no profile is redirected to `/profile` with a "complete your profile" prompt but is not blocked from navigating elsewhere. RLS guarantees any authenticated user can read profiles (enabling later discovery) while only the owner can insert/update their own row; anonymous access is impossible.

Verify: apply migrations to a local Supabase, sign in, visit `/profile`, create then edit a profile with a photo, confirm the row + uploaded object exist and that an anonymous request to profile data is refused by RLS.

## What We're NOT Doing

- **No dog profile (S-02)** — separate slice; this plan touches only owner profiles. The photo/storage + RLS patterns are built here to be reused by S-02.
- **No discovery list (S-03)** — the read-all RLS policy is set up to enable it, but no listing UI/endpoint is built.
- **No filters (FR-008), no external OAuth providers (FR-001/OQ-005), no chat, no map** — all out of scope / parked.
- **No standalone F-01 change** — its minimal foundation is absorbed into Phase 1; a full data layer (dogs, invitations, meetings) is explicitly not built.
- **No delete-profile / account-deletion flow** — MVP is create + edit only.

## Implementation Approach

Build the vertical bottom-up in three phases: (1) the migration + RLS + Storage foundation that establishes the reusable pattern, (2) the typed backend contract (DTO + service + upsert endpoint incl. photo upload), (3) the UI and soft onboarding gate. Each phase follows existing conventions (`@/` alias, Supabase SSR client with null-guard, zod validation, React island forms, `cn()` for classes). Photo upload uses a dedicated Storage bucket with per-user path prefixing so RLS can restrict writes to the owner.

## Critical Implementation Details

- **Storage RLS keys on object path.** Supabase Storage policies match on `storage.objects` rows; to restrict a user to their own avatar, prefix object paths with the user id (e.g. `<auth-uid>/avatar.<ext>`) and write the policy against `(storage.foldername(name))[1] = auth.uid()::text`. Uploading to a flat path makes per-user write restriction impossible.
- **Upsert, not insert-or-update branching.** The single `/profile` form serves both create and edit; use a Postgres upsert (`on conflict (id) do update`) keyed on `id = auth.uid()` so the endpoint has one code path and cannot create a second row for a user.

## Phase 1: Data & Privacy Foundation (absorbed F-01)

### Overview

Establish the Supabase migration workflow, the `profiles` table with granular RLS, an avatars Storage bucket with per-user policies, and route gating for `/profile`. This is the reusable data/privacy pattern the rest of the roadmap depends on.

### Changes Required:

#### 1. Profiles table migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_create_profiles.sql`

**Intent**: Create the first domain table — a 1:1 owner profile keyed to the auth user — and turn on RLS with granular per-operation policies, establishing the convention F-01 was meant to set.

**Contract**: Table `profiles` with columns: `id uuid primary key references auth.users(id) on delete cascade`, `name text not null`, `district text`, `city text`, `avatar_path text`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`. `alter table profiles enable row level security`. Policies: `select` for role `authenticated` using `true`; `insert` for `authenticated` with check `auth.uid() = id`; `update` for `authenticated` using/with check `auth.uid() = id`. No `delete` policy (out of scope). An `updated_at` trigger is optional; if added, keep it in this migration.

#### 2. Avatars Storage bucket migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_create_avatars_bucket.sql`

**Intent**: Create a Storage bucket for owner (and later dog) photos with policies that let any authenticated user read but only the owning user write to their own path prefix.

**Contract**: Insert a bucket `avatars` into `storage.buckets` (public read acceptable, or authenticated-only read — see decision). Policies on `storage.objects` for bucket `avatars`: `select` for `authenticated`; `insert`/`update` for `authenticated` with check `(storage.foldername(name))[1] = auth.uid()::text`. Object naming convention: `<auth-uid>/avatar.<ext>`.

#### 3. Gate the profile route

**File**: `src/middleware.ts`

**Intent**: Require login for `/profile` the same way `/dashboard` is gated.

**Contract**: Add `"/profile"` to `PROTECTED_ROUTES`. No other logic change (the soft-gate redirect for logged-in users without a profile is added in Phase 3).

### Success Criteria:

#### Automated Verification:

- Migrations apply cleanly against local Supabase: `npx supabase migration up` (or `npx supabase db reset`)
- Lint passes: `npm run lint`
- Build passes (type-check): `npm run build`

#### Manual Verification:

- With RLS on, an anonymous (unauthenticated) query to `profiles` returns no rows / is refused; an authenticated user can select but cannot insert a row with a different `id`.
- The `avatars` bucket exists and an authenticated user can upload only under their own `<uid>/` prefix.
- Visiting `/profile` while logged out redirects to `/auth/signin`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Profile Backend & Types

### Overview

Add the typed profile contract: the DTO in `src/types.ts`, a profile service in `src/lib/services/`, and the `/api/profile` upsert endpoint including photo upload to Storage.

### Changes Required:

#### 1. Shared Profile types

**File**: `src/types.ts` (new)

**Intent**: Introduce the shared entity + DTO for profiles so the endpoint, service, and UI agree on shape.

**Contract**: Export `Profile` (row shape: `id`, `name`, `district`, `city`, `avatarPath`/`avatarUrl`, timestamps) and `ProfileInput` (the writable subset: `name`, `district`, `city`, optional photo). Names are the source of truth for later slices.

#### 2. Profile service

**File**: `src/lib/services/profile.ts` (new)

**Intent**: Encapsulate profile read/upsert and photo upload against the Supabase client, keeping the endpoint thin.

**Contract**: Functions taking a Supabase client + user id: `getProfile(client, userId): Promise<Profile | null>`, `upsertProfile(client, userId, input): Promise<Profile>` (upsert keyed on `id`), and `uploadAvatar(client, userId, file): Promise<string>` (uploads to `avatars/<userId>/avatar.<ext>`, returns the stored path). All must handle a `null` client path consistently with auth routes.

#### 3. Profile API endpoint

**File**: `src/pages/api/profile.ts` (new)

**Intent**: Accept the profile form submission, validate it, upload the photo if present, and upsert the row — mirroring the auth endpoints' redirect-on-error contract.

**Contract**: `export const prerender = false`. `POST` handler reads `formData`, validates with a zod schema (`name` required non-empty; `district`/`city` optional trimmed strings; photo optional with content-type + size checks). On the null client or validation/DB error, redirect to `/profile?error=<msg>`; on success upload avatar (if provided) then upsert and redirect to `/profile?saved=1`. Follow the uppercase-export + `@/` import conventions.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build passes (type-check): `npm run build`
- Smoke test still passes against a running server: `npm run smoke`

#### Manual Verification:

- POSTing valid profile data creates a row on first submit and updates the same row (no duplicate) on second submit.
- Invalid input (empty name, oversized/non-image file) redirects back with a readable `?error=` message and persists nothing.
- An uploaded photo lands at `avatars/<uid>/avatar.<ext>` and its path/URL is stored on the profile row.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Profile UI & Onboarding

### Overview

Add the protected `/profile` page with a create-or-edit React island form (including photo picker) and the soft onboarding redirect for logged-in users without a profile.

### Changes Required:

#### 1. Profile page

**File**: `src/pages/profile.astro` (new)

**Intent**: Server-render the profile page, fetch the current user's profile, and mount the form island pre-filled (or empty on first visit), surfacing `?error=` / `?saved=1` feedback.

**Contract**: Uses `Astro.locals.user` + the profile service to load the existing `Profile | null`, reads `error`/`saved` from `Astro.url.searchParams`, and renders `ProfileForm client:load` with those props inside `Layout.astro`. Follows the `signup.astro` page structure.

#### 2. Profile form island

**File**: `src/components/profile/ProfileForm.tsx` (new)

**Intent**: Single form for both create and edit — name, district, city, photo — with client-side validation and server-error display, matching the auth form pattern.

**Contract**: Props: `profile?: Profile | null`, `serverError?: string | null`, `saved?: boolean`. `method="POST" action="/api/profile"`, `enctype="multipart/form-data"` for the file input. Reuses `FormField` / `SubmitButton` / `ServerError`; a file input for the photo with an optional preview of the existing `avatarUrl`. Client-side validation requires a non-empty name. Uses `cn()` for any conditional classes.

#### 3. Soft onboarding redirect

**File**: `src/middleware.ts`

**Intent**: Nudge logged-in users who have no profile toward `/profile` without trapping them.

**Contract**: After `locals.user` is resolved and the user is authenticated, if the request targets a protected app route other than `/profile` (and not an API/auth path) and the user has no profile row, redirect to `/profile?onboarding=1`. Must avoid redirect loops (skip when already on `/profile`) and must not run for anonymous users (they hit the existing gate first). Keep the profile lookup cheap (single `select` by id). `ProfileForm`/`profile.astro` surface the `onboarding=1` prompt copy.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build passes (type-check): `npm run build`
- Smoke test passes: `npm run smoke`

#### Manual Verification:

- A logged-in user with no profile is redirected to `/profile?onboarding=1` and sees the prompt, but can still navigate to `/dashboard` without being forced back.
- Creating a profile with a photo shows the saved state; re-opening `/profile` shows the form pre-filled with the stored values and photo preview.
- The page is usable on a mobile-width viewport (NFR: mobile-first).
- After a profile exists, the onboarding redirect no longer fires.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- No unit-test runner exists in the project; validation logic is covered by the zod schema and exercised via manual + smoke testing. (Introducing a test runner is out of scope for this slice.)

### Integration Tests:

- Manual end-to-end against a local Supabase (`npx supabase start`): migrations applied, auth session live.

### Manual Testing Steps:

1. `npx supabase start`, apply migrations, `npm run dev`.
2. Sign up / sign in; confirm redirect to `/profile?onboarding=1`.
3. Submit with empty name → see error, no row created.
4. Submit valid name + district + city + photo → row created, photo at `avatars/<uid>/avatar.<ext>`.
5. Reopen `/profile` → fields + photo pre-filled; edit a field and save → same row updated (no duplicate).
6. Log out, request profile data anonymously → refused by RLS; `/profile` redirects to signin.

## Performance Considerations

- NFR: mobile perceived load < 2s applies chiefly to the discovery list (S-03), not this form. Keep the onboarding profile-existence check to a single indexed `select` by primary key to avoid adding latency to every protected request.

## Migration Notes

- First-ever migrations for this project; run against a fresh local Supabase and against the live project before deploy. RLS is enabled from the first migration — verify policies before relying on client reads.

## References

- Roadmap item S-01: `context/foundation/roadmap.md` (§Slices → S-01)
- PRD FR-002 / US-01 / NFR-privacy: `context/foundation/prd.md`
- Auth endpoint pattern: `src/pages/api/auth/signup.ts:1-20`
- Form island pattern: `src/components/auth/SignUpForm.tsx`
- Route gating: `src/middleware.ts:4`
- Supabase SSR client: `src/lib/supabase.ts:5`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data & Privacy Foundation (absorbed F-01)

#### Automated

- [ ] 1.1 Migrations apply cleanly against local Supabase (`npx supabase migration up`)
- [ ] 1.2 Lint passes (`npm run lint`)
- [x] 1.3 Build passes / type-check (`npm run build`)

#### Manual

- [ ] 1.4 RLS: anonymous select refused; authenticated user cannot insert a row with a foreign `id`
- [ ] 1.5 `avatars` bucket exists; authenticated upload restricted to own `<uid>/` prefix
- [ ] 1.6 `/profile` while logged out redirects to `/auth/signin`

### Phase 2: Profile Backend & Types

#### Automated

- [ ] 2.1 Lint passes (`npm run lint`)
- [ ] 2.2 Build passes / type-check (`npm run build`)
- [ ] 2.3 Smoke test passes (`npm run smoke`)

#### Manual

- [ ] 2.4 Valid POST creates then updates the same row (no duplicate)
- [ ] 2.5 Invalid input redirects with readable `?error=` and persists nothing
- [ ] 2.6 Uploaded photo lands at `avatars/<uid>/avatar.<ext>` and path stored on row

### Phase 3: Profile UI & Onboarding

#### Automated

- [ ] 3.1 Lint passes (`npm run lint`)
- [ ] 3.2 Build passes / type-check (`npm run build`)
- [ ] 3.3 Smoke test passes (`npm run smoke`)

#### Manual

- [ ] 3.4 No-profile user redirected to `/profile?onboarding=1` but can still navigate away
- [ ] 3.5 Create shows saved state; reopen shows pre-filled form + photo preview
- [ ] 3.6 Page usable at mobile width
- [ ] 3.7 After profile exists, onboarding redirect no longer fires
