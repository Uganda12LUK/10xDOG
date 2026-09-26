# Owner Discovery List — Plan Brief

> Full plan: `context/changes/owner-discovery-list/plan.md`

## What & Why

Build the `/owners` discovery list so logged-in users can browse dog
owners in their city and tap into the walk-socialisation loop.
FR-004 (US-01) requires this before the invitation flow (S-04) can start.

## Starting Point

`Profile` and `Dog` tables exist with RLS open to all authenticated users.
`getProfile(userId)` and `listDogs(ownerId)` exist, but there is no
function that lists multiple owners or joins profiles with their dogs.

## Desired End State

A logged-in user sees `/owners` with owner cards (photo, name, location,
dogs). Clicking a card opens `/owners/[id]` — a stub with a disabled
"Send walk invitation" button that S-04 will wire up. Logged-out access
redirects to sign-in.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Card content | Owner + their dogs (name, breed) | Core value is seeing the dog before inviting — avoids an extra click |
| Location filter | Same city as logged-in user | Matches FR-004; district-first with city fallback if 0 results |
| Click target | Stub `/owners/[id]` now | Stable URL for S-04 to anchor the invitation form |
| Empty state | Text + automatic fallback to city-wide | Avoids blank screen for users in low-density districts |
| Exclude self | Yes | Own card has no utility in a discovery list |
| Filters (breed/age) | Out of scope | FR-008 parked as nice-to-have |

## Scope

**In scope:**
- `OwnerWithDogs` type in `src/types.ts`
- `listOwners(client, userId, city, district?)` in `src/lib/services/profile.ts`
- `src/pages/owners/index.astro` with district→city fallback and empty state
- `src/pages/owners/[id].astro` stub with disabled invite button
- `/owners` added to `PROTECTED_ROUTES` in `src/middleware.ts`
- "Owners" link added to `src/components/Topbar.astro`

**Out of scope:**
- Walk invitation form (S-04)
- Breed/age/distance filters (FR-008, parked)
- Pagination
- Real-time updates

## Architecture / Approach

Pure SSR (no React needed). `listOwners` uses two sequential Supabase
queries — profiles filtered by city/district, then dogs fetched by owner
IDs and joined in JS. This avoids relying on an unconfirmed PostgREST
foreign-key relationship between `profiles` and `dogs` (both reference
`auth.users.id` separately).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Service Layer | `OwnerWithDogs` type + `listOwners()` | Two-query join must handle empty dog lists gracefully |
| 2. Pages | `/owners` list + `/owners/[id]` stub | District fallback logic must not double-render |
| 3. Navigation | Topbar link + PROTECTED_ROUTES guard | Order in Topbar must match visual expectation |

**Prerequisites:** S-01 (owner profile) and S-02 (dog profile) done ✓;
seed data in `supabase/seed.sql` covers alice + bob with dogs for local testing.
**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- If a user's `city` field is null (profile incomplete), `listOwners` falls
  back to returning all owners — acceptable for MVP.
- The seed data (alice in Mokotów/Warsaw, bob in Żoliborz/Warsaw) lets you
  test the district-fallback path locally; both share city=Warsaw.

## Success Criteria (Summary)

- Logged-in user sees at least one owner card on `/owners` (given seed data)
- Clicking a card opens `/owners/[id]` with owner info and a disabled invite button
- Logged-out access to `/owners` or `/owners/[id]` redirects to `/auth/signin`
