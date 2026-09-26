# Owner Discovery List — Implementation Plan

## Overview

Build the `/owners` page where a logged-in user can browse dog owners in
their city, with each card showing the owner's name, photo, location and
their dogs (name + breed). Clicking a card opens a stub `/owners/[id]`
page that will anchor the walk-invitation button in S-04.

## Current State Analysis

- `Profile` type (`src/types.ts:1`) has `id`, `name`, `district`, `city`,
  `avatarPath`, `avatarUrl`.
- `Dog` type (`src/types.ts:19`) has `id`, `ownerId`, `name`, `breed`,
  `birthdate`, `photoPath`, `photoUrl`.
- `getProfile(client, userId)` (`src/lib/services/profile.ts:53`) returns a
  single profile — no list function exists.
- `listDogs(client, ownerId)` (`src/lib/services/dog.ts:44`) lists dogs for
  one owner — no multi-owner variant exists.
- RLS `profiles_select_authenticated` allows any logged-in user to SELECT
  all profiles (`supabase/migrations/20260923090001_create_profiles.sql:34`).
- RLS `dogs_select_authenticated` allows any logged-in user to SELECT all
  dogs (`supabase/migrations/20260924090001_create_dogs.sql:30`).
- List page pattern: `src/pages/dogs/index.astro` — SSR, no React, cards
  with `rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl`.
- `PROTECTED_ROUTES = ["/dashboard", "/profile", "/dogs"]`
  (`src/middleware.ts:5`) — `/owners` is not yet guarded.

## Desired End State

- `/owners` shows all owners who share the logged-in user's city; if the
  user also has a district set, owners in that district appear first (or
  only, with a fallback to city-wide when empty).
- Each card: owner avatar (🐾 fallback), name, district/city, and a list
  of their dogs (name + breed).
- Clicking a card opens `/owners/[id]` with the owner's profile and dogs,
  plus a placeholder "Send walk invitation" button (non-functional until
  S-04).
- Logged-out users hitting `/owners` are redirected to `/auth/signin`.

### Key Discoveries

- No `listOwners` function exists — must be created in
  `src/lib/services/profile.ts`.
- The join between profiles and dogs must be done in two queries (profiles
  filtered by city, then dogs by owner IDs) because `dogs.owner_id`
  references `auth.users.id`, not `profiles.id` directly — no automatic
  PostgREST relationship.
- The current user's own profile must be excluded from the list
  (`neq('id', userId)`).
- Location source for filtering: the logged-in user's own profile; if that
  profile has no city set, skip the location filter and return all owners.

## What We're NOT Doing

- FR-008 filters (breed, age, distance) — explicitly parked as nice-to-have.
- A real walk-invitation form on `/owners/[id]` — that's S-04.
- Pagination — small data volume, single-page list is sufficient for MVP.
- Real-time updates — SSR page refresh is the update mechanism.

## Implementation Approach

Three independent phases that naturally sequence service → UI → nav.
Phase 1 (service layer) is a prerequisite for Phases 2 and 3; Phases 2
and 3 can be implemented in either order after Phase 1 lands.

---

## Phase 1: Service Layer

### Overview

Add the `OwnerWithDogs` type and `listOwners()` function. No UI changes —
this phase is purely data access.

### Changes Required

#### 1. OwnerWithDogs type

**File**: `src/types.ts`

**Intent**: Introduce a composite type that pairs a profile with its dogs,
used by `listOwners()` and the two new pages.

**Contract**: Add after the existing `Dog` interface:

```ts
export interface OwnerWithDogs {
  profile: Profile;
  dogs: Dog[];
}
```

#### 2. listOwners service function

**File**: `src/lib/services/profile.ts`

**Intent**: Fetch profiles filtered by city (and optionally district),
excluding the current user, joined with each owner's dogs in a second
query. Return `OwnerWithDogs[]` sorted by name.

**Contract**: Export `async function listOwners(client: SupabaseClient, userId: string, city: string, district?: string | null): Promise<OwnerWithDogs[]>`.

Query approach — two sequential Supabase calls:
1. `profiles` table: `select('*').eq('city', city).neq('id', userId)` (add `.eq('district', district)` when district is provided and non-null).
2. `dogs` table: `select('*').in('owner_id', profileIds)` to batch-fetch all dogs for the returned owners.
3. Join in JS: group dogs by `owner_id`, pair with each profile.
4. Map DB snake_case columns to the `Profile`/`Dog` camelCase types via the same mapping already used in `getProfile` and `listDogs`.
5. Sort result by `profile.name` ascending.

### Success Criteria

#### Automated Verification

- `npm run lint` passes with no new errors
- `npm run build` passes with no TypeScript errors

#### Manual Verification

- `listOwners` is importable and TypeScript reports no type errors at call sites

**Implementation Note**: After Phase 1, confirm before proceeding to Phase 2.

---

## Phase 2: Pages

### Overview

Add `src/pages/owners/index.astro` (discovery list) and
`src/pages/owners/[id].astro` (owner stub). No new React components
needed — both pages are pure SSR following the `dogs/index.astro` pattern.

### Changes Required

#### 1. /owners/index.astro

**File**: `src/pages/owners/index.astro`

**Intent**: Render the discovery list. Fetch the current user's profile to
get their city/district; call `listOwners` with district filter first; if
0 results and a district was set, call again city-wide and set a
`showingCityWide` flag to display an informational banner.

**Contract**:
- If user's profile has no city: call `listOwners` without city filter
  (pass no city argument — function returns empty array when city is null,
  so show a "Set your city in Profile to see local owners" message).
- Banner text when fallback triggered: `"No owners in your district yet — showing all owners in {city}"`.
- Empty state (zero results even city-wide): `"No other owners found in {city} yet."` with a link to `/profile` to check location settings.
- Card layout matches `dogs/index.astro`: `<ul class="space-y-3">`, each
  card `<a href="/owners/{id}" class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition-colors hover:bg-white/15">`.
- Owner section: avatar (`size-16 rounded-full`) with 🐾 fallback, then
  name (`font-medium text-white`), district/city (`text-sm text-blue-100/70`).
- Dogs section: below the owner line, a compact list of the owner's dogs —
  each dog as `"• {name} ({breed})"` in `text-xs text-blue-100/60`.

#### 2. /owners/[id].astro

**File**: `src/pages/owners/[id].astro`

**Intent**: Stub profile view for a single owner. Fetch their profile and
dogs; render the owner's name, avatar, district/city and list of dogs;
show a disabled "Send walk invitation" button as a placeholder for S-04.

**Contract**:
- Redirect to `/owners` if profile not found.
- Reuse the card panel style (`max-w-sm rounded-2xl border border-white/10 bg-white/10 p-8 text-white backdrop-blur-xl`).
- Button: `<button disabled class="...opacity-50 cursor-not-allowed">Send walk invitation</button>`.
  Add an HTML comment `{/* S-04: wire invitation API here */}` adjacent to
  the button so S-04 has a clear anchor.
- Page must not show the current user their own profile (redirect to
  `/profile` if `id === user.id`).

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- Navigate to `/owners` while logged in — list renders with owner cards
- If current user's profile has both name and city set, at least one other
  owner appears (or the empty state message)
- District fallback: manually change your profile district to something
  unique — list should show "showing all owners in {city}" banner
- Clicking an owner card navigates to `/owners/{id}` with that owner's
  profile and dogs
- The "Send walk invitation" button is visible but disabled on `/owners/[id]`
- Visiting `/owners/{own-user-id}` redirects to `/profile`

**Implementation Note**: After Phase 2, confirm before proceeding to Phase 3.

---

## Phase 3: Navigation

### Overview

Add the `/owners` route guard and the Topbar link.

### Changes Required

#### 1. PROTECTED_ROUTES

**File**: `src/middleware.ts`

**Intent**: Add `/owners` so unauthenticated users are redirected to
`/auth/signin` when they try to access the discovery list or an owner
profile.

**Contract**: Append `"/owners"` to `PROTECTED_ROUTES` array (`src/middleware.ts:5`).

#### 2. Topbar link

**File**: `src/components/Topbar.astro`

**Intent**: Add "Owners" navigation link so the discovery list is
reachable from every page.

**Contract**: Insert `<a href="/owners" ...>Owners</a>` between the existing
"Dashboard" and "Profile" links, using the same class as the other nav links:
`class="text-purple-300 transition-colors hover:text-purple-100 hover:underline"`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- "Owners" link appears in the top navigation on every page when logged in
- Visiting `/owners` while logged out redirects to `/auth/signin`
- Visiting `/owners/some-id` while logged out redirects to `/auth/signin`

---

## Testing Strategy

### Manual Testing Steps

1. Log in as `alice@example.com` (seed user, Warsaw / Mokotów)
2. `/owners` — confirm Bob's card appears with dog Max (Labrador Retriever)
3. Click Bob's card — confirm `/owners/{bob-id}` shows Bob's profile + Max
4. Confirm "Send walk invitation" button is visible but disabled
5. Log out — visit `/owners` directly — confirm redirect to `/auth/signin`
6. Change alice's district to something unique — confirm fallback banner appears

## References

- Roadmap: `context/foundation/roadmap.md` (S-03, line 47)
- PRD: `context/foundation/prd.md` (FR-004, US-01)
- Contract surfaces: `docs/reference/contract-surfaces.md`
- Profiles migration: `supabase/migrations/20260923090001_create_profiles.sql`
- Dogs migration: `supabase/migrations/20260924090001_create_dogs.sql`
- Existing list pattern: `src/pages/dogs/index.astro`
- Profile service: `src/lib/services/profile.ts`
- Dog service: `src/lib/services/dog.ts`
- Types: `src/types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Service Layer

#### Automated

- [x] 1.1 npm run lint passes
- [x] 1.2 npm run build passes

#### Manual

- [x] 1.3 listOwners importable with no TypeScript errors at call sites

### Phase 2: Pages

#### Automated

- [ ] 2.1 npm run lint passes
- [ ] 2.2 npm run build passes

#### Manual

- [ ] 2.3 /owners renders owner cards when logged in
- [ ] 2.4 District fallback banner appears when district yields 0 results
- [ ] 2.5 Clicking a card navigates to /owners/[id] with owner profile and dogs
- [ ] 2.6 Send walk invitation button visible but disabled on /owners/[id]
- [ ] 2.7 Visiting /owners/own-user-id redirects to /profile

### Phase 3: Navigation

#### Automated

- [ ] 3.1 npm run lint passes
- [ ] 3.2 npm run build passes

#### Manual

- [ ] 3.3 Owners link appears in top nav on every page when logged in
- [ ] 3.4 /owners while logged out redirects to /auth/signin
- [ ] 3.5 /owners/some-id while logged out redirects to /auth/signin
