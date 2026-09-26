# Data-Privacy Baseline — Plan Brief

> Full plan: `context/changes/data-privacy-baseline/plan.md`

## What & Why

Formalize the data-privacy foundation (F-01) whose concrete work landed inside
S-01/S-02 before the foundation was formally planned. The foundation is almost
entirely in place; this plan verifies it is correct, fills the two absent artifacts
(`supabase/seed.sql` and `docs/reference/contract-surfaces.md`), and stamps F-01
as done so S-03+ can build on a verified, documented baseline.

## Starting Point

Three migrations with granular RLS exist in `supabase/migrations/`; the auth
middleware in `src/middleware.ts` already gates `/dashboard`, `/profile`, and `/dogs`.
`supabase/seed.sql` is referenced in `supabase/config.toml` but absent, and there
is no `docs/reference/contract-surfaces.md` to document the established patterns.

## Desired End State

A confirmed-correct RLS + middleware foundation, a working seed file that populates
two fake users/profiles/dogs on `npx supabase db reset`, and a contract-surfaces
document that any future slice author can read in under 5 minutes to know exactly
what RLS policies to write and where to register new protected routes.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Remaining scope | Verify + document | Most implementation already exists; only seed file and contract doc are missing | Plan |
| Future PROTECTED_ROUTES | Each slice adds its own | Routes should be added only when the page exists, avoiding dead entries | Plan |
| Verification level | Manual browser test | Quick and catches the realistic failure modes without CI tooling changes | Plan |
| Seed file | Yes — 2 fake users + profiles + dogs | `config.toml` references it; S-03+ list views need data to be testable locally | Plan |

## Scope

**In scope:**
- Audit of all three existing migrations for RLS correctness
- Audit of `src/middleware.ts` PROTECTED_ROUTES coverage
- Create `supabase/seed.sql` with 2 fake users, profiles, and dogs
- Create `docs/reference/contract-surfaces.md` documenting the four load-bearing patterns

**Out of scope:**
- Pre-registering future slice routes in PROTECTED_ROUTES
- Automated RLS smoke tests in CI
- Any schema, column, or index changes
- Authentication changes

## Architecture / Approach

No architectural changes. The RLS pattern is already established: `enable row level security`
on every table, `_select_authenticated` (role `authenticated`, USING `true`) for all reads,
`_insert_own` / `_update_own` / `_delete_own` with `auth.uid() = <owner_column>` for writes.
Middleware gates protect routes at the HTTP layer as a first line; RLS enforces the same
boundary at the database layer. The two layers are complementary — neither alone is sufficient.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Audit & Verify | Confirmed-correct RLS + middleware, manual redirect test | May uncover a gap that requires an unplanned fix |
| 2. Seed File | `supabase/seed.sql` with 2 fake users/profiles/dogs | Requires local Docker + Supabase to verify |
| 3. Contract Surfaces Doc | `docs/reference/contract-surfaces.md` covering 4 conventions | Low risk — pure docs |

**Prerequisites:** Local Supabase instance (Docker) for Phase 2 verification; live Supabase project + running dev server for Phase 1 manual test.
**Estimated effort:** ~1 session across 3 short phases.

## Open Risks & Assumptions

- The `auth.users` insert pattern in `seed.sql` uses `crypt()` + `gen_salt('bf')` — this requires the `pgcrypto` extension to be enabled in the local Supabase instance (it is by default in Supabase local dev).
- If Phase 1 audit reveals an RLS gap (e.g., missing policy on avatars bucket for DELETE), Phase 1 scope expands to fix it before proceeding.

## Success Criteria (Summary)

- Unauthenticated browser request to `/profile` and `/dogs` always redirects to `/auth/signin`
- `npx supabase db reset` produces 2 populated profiles and 2 dogs in the local instance
- `docs/reference/contract-surfaces.md` exists and a future slice author has a single file to reference for RLS patterns, route protection, and migration naming
