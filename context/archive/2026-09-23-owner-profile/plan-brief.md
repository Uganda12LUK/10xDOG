# Owner Profile (S-01) — Plan Brief

> Full plan: `context/changes/owner-profile/plan.md`

## What & Why

Build the owner-profile slice (PRD FR-002 / US-01): a logged-in user can create and edit their profile — name, photo, district/city. It's the first user-visible slice of Stream A and the trust foundation every later meetup/breeding flow builds on. Because it's the first data-backed feature, it also lands the minimal data/privacy foundation the roadmap called F-01.

## Starting Point

Auth is live and reusable (Supabase SSR client, middleware gating `/dashboard`), and the API + React-island form patterns are established by the auth flow. But there is **no data layer**: `supabase/` has only `config.toml` — no migrations, no tables, no RLS, no Storage bucket, and no `src/types.ts`. There is no unit-test runner (lint/build/smoke only).

## Desired End State

Logged-in users visit `/profile`, fill or edit a form (name, district, city, photo), and save to a one-per-user `profiles` row with the photo in a Supabase Storage bucket. First-time users are softly nudged to `/profile` after login without being blocked. RLS lets any authenticated user read profiles (enabling later discovery) while only the owner can write their own row; anonymous access is impossible.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| F-01 dependency | Absorb minimal F-01 into Phase 1 | Unblocks a shippable slice now and sets the RLS pattern on real data instead of an abstract foundation | Plan |
| Photo handling | Supabase Storage upload (avatars bucket + per-user RLS) | Real photo UX per PRD; establishes the storage pattern S-02 (dog photo) reuses | Plan |
| Data model | 1:1 `profiles` keyed by `auth.users.id`; district + city separate text fields | Simplest ownership model for RLS (`auth.uid() = id`); separate fields let S-03 discovery filter cleanly | Plan |
| Onboarding | Soft gate — redirect + prompt, non-blocking | Nudges completion (needed for discovery) without trapping users | Plan |
| RLS read scope | Any authenticated user can read all profiles; owner-only insert/update | Enables S-03 discovery with no RLS rework; still login-gated per guardrail | Plan |
| Profile UX | Single `/profile` page, one form, `/api/profile` upsert | One form/endpoint/state; matches existing auth island pattern | Plan |

## Scope

**In scope:** first Supabase migrations (profiles table + RLS + avatars bucket), `/profile` route gating, `Profile` DTO in `src/types.ts`, profile service, zod-validated `/api/profile` upsert with photo upload, `/profile` page + `ProfileForm` island, soft onboarding redirect.

**Out of scope:** dog profile (S-02), discovery list (S-03), filters (FR-008), external OAuth, chat, map, profile/account deletion, a standalone F-01 change, and any wider data layer (dogs, invitations, meetings).

## Architecture / Approach

Bottom-up vertical: **Phase 1** migration + RLS + Storage foundation and route gating; **Phase 2** typed backend (`Profile` DTO → `src/lib/services/profile.ts` → `/api/profile` upsert incl. photo upload); **Phase 3** `/profile` page + `ProfileForm` island + soft onboarding redirect in middleware. Reuses existing conventions: `@/` alias, null-guarded Supabase SSR client, zod validation, `client:load` islands, `cn()` for classes. Photo paths are prefixed with the user id so Storage RLS can restrict writes to the owner.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data & privacy foundation | profiles table + RLS, avatars bucket + policies, `/profile` gating | Getting RLS/Storage policies correct on the first-ever migration |
| 2. Backend & types | `Profile` DTO, service, `/api/profile` upsert + photo upload | Storage per-user path policy + upsert single-row correctness |
| 3. UI & onboarding | `/profile` page, `ProfileForm`, soft onboarding redirect | Onboarding redirect loops / added latency on protected routes |

**Prerequisites:** local Supabase (`npx supabase start`, Docker) and configured `SUPABASE_URL`/`SUPABASE_KEY`; Node 22.14.0.
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Absorbing F-01 here means the standalone F-01 roadmap item becomes redundant — the roadmap should reflect that these tables/RLS now originate in S-01.
- No automated test runner exists, so correctness leans on lint, build, smoke, and manual verification against local Supabase.
- Storage per-user write RLS depends on the `<uid>/…` path convention being honored by the upload code.

## Success Criteria (Summary)

- A logged-in user can create and edit a profile (name, district/city, photo) that persists to one row + a stored image.
- Anonymous access to profile data is refused; only the owner can modify their own row.
- First-time users are nudged to complete their profile without being blocked from the app.
