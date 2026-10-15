# Profile Private Location — DB-Boundary Privacy Implementation Plan

## Overview

Move the three private profile columns (`district`, `location_lat`, `location_lng`) off
`profiles` into an owner-only `profile_locations` table, and perform geographic discovery
through a `SECURITY DEFINER` RPC that returns only public owner IDs. After this, a direct
Supabase Data API `select *` on another user's profile can no longer return their street
or GPS — the hole RLS (row-level, not column-level) left open — while the owner retains
full access to their own location and discovery behaves as today.

## Current State Analysis

- `profiles` columns: `id, name, district, city, avatar_path, location_lat, location_lng,
  created_at, updated_at`. `district`/`location_*` added by `20261004090002`.
- RLS `profiles_select_authenticated ... using (true)` (20260923090001:34) — any
  authenticated user reads every column of every profile via the Data API. The app-layer
  `getPublicProfile()` does not constrain the Data API.
- `src/lib/services/profile.ts:161` `listOwners` does `select("*")` and geo-filters in JS
  using `discoveryPosition`/`withinDiscoveryRadius` (geo.ts) with `cityCenter` fallback.
- Self consumers of the private fields: `src/pages/profile.astro` → `ProfileForm.tsx`
  (street input + draggable pin) and `src/pages/map/index.astro` (own pin → discovery anchor).
- Write path: `src/pages/api/profile.ts` → `upsertProfile` writes all fields to `profiles`.
- `getPublicProfile`/`mapPublicRow` already select only `id,name,city,avatar_path` — unaffected.

### Key Discoveries:

- The client map never needs *other* owners' real coords: `DogMap` places pins at
  `cityCenter(ownerCity)` + jitter (public `city`), so only self-anchor + server-side radius
  filtering use real coords (geo.ts, DogMap.tsx).
- Discovery semantics to preserve (tests/unit/discovery.test.ts): anchor = own pin ∥
  city-center(own city); owner pos = their pin ∥ city-center(their city); keep if within
  `DISCOVERY_RADIUS_KM` (75); null anchor → show everyone; null owner pos with an anchor → drop.
- `cityCenter` normalization folds case + strips combining diacritics but does NOT fold `ł`
  (single codepoint, not NFD-decomposed). The RPC uses `lower(unaccent(city))`, which also
  folds `ł→l` — a benign *more-lenient* divergence that does not affect the JS-only
  `cityCenter` unit tests.
- Verification is DB-gated (no local Postgres); integration tests run against the remote
  test project; CI does not run vitest except the unit job.

## Desired End State

`profiles` holds only public columns. `profile_locations` (owner-only RLS) holds the private
location; only its owner can read/write it via the Data API. Discovery returns the same owners
as today through `discoverable_owner_ids()` without any coordinate leaving the database. The
owner still edits their street + pin on `/profile`; the map still anchors on the viewer's own
pin. A direct-client A/B test proves user B cannot read user A's street/GPS.

Verify: `npm run test` → `profile-location-privacy.test.ts` GREEN once the migration is applied
to the test DB; `npm run build`, `npm run lint`, existing unit + discovery tests still green.

## What We're NOT Doing

- Not changing the **meeting** location columns (`invitations.location_lat/lng`) — different concept.
- Not removing `cityCenter`/`CITY_CENTERS`/`discoveryPosition`/`withinDiscoveryRadius` from geo.ts —
  still used client-side (dogFilter, DogMap, OwnersMapView) and unit-tested; they just stop driving
  the *server* discovery path.
- Not adding a profile delete path.
- Not reworking `getPublicProfile` (already public-safe).
- Not applying the migration to prod/test DB in this change — that is the user's gated step.

## Implementation Approach

DB boundary first (migration + RPC + A/B test), then the service/type layer that depends on the
new shape, then the UI/API that depends on the service. The private columns become unreachable by
construction (separate table + owner-only RLS); discovery moves server-side into a definer RPC that
emits only IDs, so the public read path and the client map are unchanged in behavior.

## Critical Implementation Details

- **Trigger ordering / data migration**: copy existing `profiles` location data into
  `profile_locations` BEFORE dropping the columns, in the same migration, idempotently
  (`on conflict (profile_id) do nothing`).
- **RPC safety**: `discoverable_owner_ids` is `SECURITY DEFINER`, `stable`, `set search_path = public`,
  and anchors on `(select auth.uid())` internally — it never accepts an arbitrary viewer id, so it
  cannot be used to compute distances from someone else's private pin. It returns only `uuid`s.
- **unaccent**: the RPC needs `create extension if not exists unaccent;` (available on Supabase).

## Phase 1: Migration — schema split, data move, discovery RPC, A/B test

### Overview

Introduce `city_centers` + `profile_locations`, migrate data, drop the private columns from
`profiles`, add the discovery RPC, and write the A/B privacy regression test.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/20261015090001_profile_private_location.sql` (new)

**Intent**: Make the private columns owner-only and move geo filtering server-side so coords never
reach the Data API, while preserving discovery behavior.

**Contract**:
- `create extension if not exists unaccent;`
- `city_centers (city text primary key, norm text not null, lat double precision not null, lng double precision not null)` seeded from the 15 entries in `geo.ts` `CITY_CENTERS` (`norm = lower(unaccent(city))`); RLS enabled, `select` to `authenticated` `using (true)` (public reference data).
- `profile_locations (profile_id uuid primary key references profiles(id) on delete cascade, district text, location_lat double precision, location_lng double precision, updated_at timestamptz not null default now())`; reuse `set_updated_at` trigger; RLS enabled with owner-only policies for **select/insert/update/delete**, all `using / with check (profile_id = (select auth.uid()))`.
- Data move: `insert into profile_locations (profile_id, district, location_lat, location_lng) select id, district, location_lat, location_lng from profiles where district is not null or location_lat is not null or location_lng is not null on conflict (profile_id) do nothing;`
- `alter table profiles drop column district, drop column location_lat, drop column location_lng;`
- RPC:

```sql
create or replace function public.discoverable_owner_ids(radius_km double precision default 75)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  -- position = saved pin, else city center (norm-matched), else null
  pos as (
    select p.id,
           coalesce(pl.location_lat, cc.lat) as lat,
           coalesce(pl.location_lng, cc.lng) as lng
    from profiles p
    left join profile_locations pl on pl.profile_id = p.id
    left join city_centers cc on cc.norm = lower(unaccent(coalesce(p.city, '')))
  ),
  anchor as (select lat, lng from pos where id = (select id from me))
  select pos.id
  from pos, anchor
  where pos.id <> (select id from me)
    and (
      anchor.lat is null  -- no anchor: show everyone
      or (pos.lat is not null
          and 2 * 6371 * asin(sqrt(
            power(sin(radians(pos.lat - anchor.lat) / 2), 2)
            + cos(radians(anchor.lat)) * cos(radians(pos.lat))
              * power(sin(radians(pos.lng - anchor.lng) / 2), 2))) <= radius_km)
    );
$$;
grant execute on function public.discoverable_owner_ids(double precision) to authenticated;
```

#### 2. A/B privacy regression test

**File**: `tests/integration/profile-location-privacy.test.ts` (new)

**Intent**: Prove at the DB boundary that a non-owner cannot read another user's street/GPS, and that
discovery still surfaces a nearby owner.

**Contract**: with test users A and B (helpers/supabase): A upserts a location (street + pin). Assert
(a) B's `from("profile_locations").select().eq("profile_id", A)` returns no row (owner-only RLS);
(b) B's `from("profiles").select("*").eq("id", A)` contains no `district`/`location_*` key, and a
`select("district")` errors (column absent); (c) `B.rpc("discoverable_owner_ids", { radius_km: 75 })`
includes A when A is near B. RED until the migration is applied to the test DB; mirrors
`consent-rls.test.ts` cleanup discipline.

### Success Criteria:

#### Automated Verification:
- Migration file parses / lints (SQL): `npm run lint` unaffected; file present.
- Test file type-checks + lints: `npm run build`, `npm run lint`.
- `profile-location-privacy.test.ts` present in the suite.

#### Manual Verification:
- Apply the migration to the test DB; `npm run test` → `profile-location-privacy.test.ts` GREEN (A/B + discovery).
- `select *` on another user's `profiles` row via SQL editor as a non-owner returns no street/GPS.

**Implementation Note**: pause for human confirmation of the GREEN pass (test-DB apply) before relying on Phase 2's discovery rewrite.

---

## Phase 2: Service + type refactor

### Overview

Make `Profile` public-only, add `OwnerLocation` + `getOwnLocation`, split `upsertProfile`, and route
`listOwners` through the RPC.

### Changes Required:

#### 1. Types

**File**: `src/types.ts`

**Intent**: Compiler-enforce that private location is not part of the public profile shape.

**Contract**: `Profile` drops `street`, `locationLat`, `locationLng` (keeps `id,name,city,avatarPath,avatarUrl,createdAt,updatedAt`). Add `export interface OwnerLocation { street: string | null; locationLat: number | null; locationLng: number | null }`. `ProfileUpsert` unchanged (write-side input still carries street/location).

#### 2. Profile service

**File**: `src/lib/services/profile.ts`

**Intent**: Read public profiles, read own location separately, write the split, discover via RPC.

**Contract**:
- `ProfileRow`/`mapRow` drop the 3 private columns; `getProfile` selects public columns only and returns the narrowed `Profile`.
- Add `getOwnLocation(client, userId): Promise<OwnerLocation | null>` reading the caller's `profile_locations` row.
- `upsertProfile` writes public fields to `profiles` and upserts `{district, location_lat, location_lng}` to `profile_locations` (two writes; surface either error).
- `listOwners` calls `client.rpc("discoverable_owner_ids", { radius_km: DISCOVERY_RADIUS_KM })`, then fetches public profiles `in` the returned ids + their dogs (existing dog fetch/sort retained); remove the `select("*")` + JS `discoveryPosition`/`withinDiscoveryRadius` filtering. `listDogsForMap` unchanged.
- `getPublicProfile`/`mapPublicRow` unchanged.

#### 3. geo.ts

**File**: `src/lib/geo.ts`

**Intent**: Keep the client-side helpers; stop using them for server discovery.

**Contract**: No change to `cityCenter`/`CITY_CENTERS`/`distanceKm`. `discoveryPosition`/`withinDiscoveryRadius` remain (still unit-tested, still used by client filters) but are no longer called by `listOwners`.

### Success Criteria:

#### Automated Verification:
- Type check passes with narrowed `Profile`: `npm run build`.
- Lint passes: `npm run lint`.
- Unit suite green (dogFilter/discovery/publicProfile/locationPrivacy): `npm run test:unit`.

#### Manual Verification:
- With the migration applied to the test DB: discovery returns the expected owners (`npm run test` integration path, or manual map check).

**Implementation Note**: pause for human confirmation before Phase 3.

---

## Phase 3: UI / API wiring

### Overview

Feed the own-location split into the profile edit page and the map anchor; keep the write endpoint working.

### Changes Required:

#### 1. Profile page

**File**: `src/pages/profile.astro`

**Intent**: Load the viewer's own location alongside the public profile and pass both to the form.

**Contract**: fetch `getOwnLocation(supabase, user.id)` and pass it to `ProfileForm` as a new `location` prop; `profile` is now the public shape.

#### 2. ProfileForm

**File**: `src/components/profile/ProfileForm.tsx`

**Intent**: Source street + pin from the new `location` prop instead of `profile`.

**Contract**: add `location: OwnerLocation | null` prop; initialize street + pin state from it (was `profile?.street` / `profile?.locationLat/lng`). Submitted field names (`street`, `location_lat`, `location_lng`) unchanged.

#### 3. Map anchor

**File**: `src/pages/map/index.astro`

**Intent**: Anchor discovery on the viewer's own pin from the new source.

**Contract**: replace `profile?.locationLat/lng` reads with `getOwnLocation(supabase, user.id)`; keep passing `userLocation` to `OwnersMapView`.

#### 4. Write endpoint

**File**: `src/pages/api/profile.ts`

**Intent**: Confirm the write still works through the split.

**Contract**: no signature change expected — it calls `upsertProfile` which now writes both tables; verify the zod schema + field names still line up. (Document as "verify, likely no edit".)

### Success Criteria:

#### Automated Verification:
- Type check + lint pass: `npm run build`, `npm run lint`.
- Full unit suite green: `npm run test:unit`.

#### Manual Verification:
- With the migration on the test DB: edit profile (street + drag pin) → saved and reloaded correctly; `/map` anchors on own pin and shows nearby owners; `view-source`/devtools on `/map` and `/pack` contain no street/coords for others.

**Implementation Note**: after automated checks pass, this change is code-complete; the GREEN gate remains the user's test-DB apply + `npm run test`.

---

## Testing Strategy

### Unit Tests:
- Existing geo/dogFilter/discovery/publicProfile/locationPrivacy unaffected (helpers retained).

### Integration Tests:
- `profile-location-privacy.test.ts` (new): A/B direct-client denial + discovery-via-RPC. RED until migration applied to the test DB, then GREEN.

### Manual Testing Steps:
1. Apply `20261015090001` to the test DB; `npm run test` → new test GREEN.
2. As a non-owner, `select *` another user's `profiles` row in the SQL editor → no street/GPS.
3. Edit own profile (street + pin), reload → values persist; `/map` anchors on own pin.

## Migration Notes

Single migration moves data then drops columns (idempotent). Apply to test → verify → prod. No rollback
of data needed (data is copied, not transformed); a down-path would re-add columns and copy back.

## References

- Reviewer blocker #1; prior app-layer change: `context/changes/owner-location-privacy/`
- Leak site: `supabase/migrations/20260923090001_create_profiles.sql:34`; cols added `20261004090002`
- Surface: `src/lib/services/profile.ts:161`, `src/pages/{profile,map/index}.astro`, `src/components/profile/ProfileForm.tsx`, `src/pages/api/profile.ts`, `src/lib/geo.ts`
- Pattern: `context/changes/pack-consent-rls/` (DB-gated RED→GREEN), `tests/integration/consent-rls.test.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Migration — schema split, data move, discovery RPC, A/B test

#### Automated
- [x] 1.1 Migration file present; lint unaffected: `npm run lint`
- [x] 1.2 Test + migration artifacts type-check: `npm run build`
- [x] 1.3 `profile-location-privacy.test.ts` present in the suite

#### Manual
- [ ] 1.4 Migration applied to test DB; `profile-location-privacy.test.ts` GREEN (A/B + discovery)
- [ ] 1.5 Non-owner `select *` on another profile returns no street/GPS (SQL editor)

### Phase 2: Service + type refactor

#### Automated
- [ ] 2.1 Type check passes with narrowed Profile: `npm run build`
- [ ] 2.2 Lint passes: `npm run lint`
- [ ] 2.3 Unit suite green: `npm run test:unit`

#### Manual
- [ ] 2.4 Discovery returns expected owners with the migration applied (map / integration)

### Phase 3: UI / API wiring

#### Automated
- [ ] 3.1 Type check + lint pass: `npm run build`, `npm run lint`
- [ ] 3.2 Full unit suite green: `npm run test:unit`

#### Manual
- [ ] 3.3 Edit profile (street + pin) persists and reloads; `/map` anchors on own pin
- [ ] 3.4 `/map` and `/pack` ship no street/coords for other owners (view-source/devtools)
