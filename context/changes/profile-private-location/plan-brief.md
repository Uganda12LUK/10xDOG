# Profile Private Location — Plan Brief

> Full plan: `context/changes/profile-private-location/plan.md`

## What & Why

`profiles` RLS lets any authenticated user read every column of any profile via the
Supabase Data API, exposing `district` + exact GPS — the app-layer `getPublicProfile()`
can't stop a direct Data API call because RLS filters rows, not columns. Move the private
location to an owner-only `profile_locations` table and do geo discovery through a
`SECURITY DEFINER` RPC that returns only public owner IDs, so coords never cross the API.

## Starting Point

`profiles` carries `district`, `location_lat`, `location_lng` (coords added by
`20261004090002`). `listOwners` `select("*")`s all profiles and geo-filters in JS;
`/profile` + `ProfileForm` edit the own street/pin; `/map` anchors on the own pin. The
client map already places *other* owners via `cityCenter(city)` + jitter — it never needs
their real coords.

## Desired End State

`profiles` is public-safe; `profile_locations` is readable/writable only by its owner;
discovery returns the same owners via `discoverable_owner_ids()` with no coordinate leaving
the DB; the owner still edits street + pin; a direct-client A/B test proves user B cannot
read user A's street/GPS.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| DB-boundary approach | Separate owner-only table + RPC | Columns physically unreachable by non-owners, even via Data API | User |
| RPC contract | `setof uuid` (IDs); JS fetches public rows+dogs | Smallest RPC surface; reuses existing mapping; coords never returned | Plan |
| City fallback | `city_centers` table + `lower(unaccent)` norm | Preserves today's discovery (pin ∥ city center) with no regression | Plan |
| Self location read | Separate `getOwnLocation()` | Clean public/private split aligned with owner-only RLS | Plan |
| `Profile` type | Public-only + new `OwnerLocation` | Compiler blocks private fields on the public path | Plan |
| Verification | A/B test, RED until migration on test DB | No local Postgres; same gated pattern as pack-consent-rls | Constraint |

## Scope

**In:** migration (city_centers + profile_locations + data move + drop columns + discovery RPC);
service/type refactor (`Profile` public, `OwnerLocation`, `getOwnLocation`, `upsertProfile` split,
`listOwners` via RPC); UI/API wiring (`/profile`, `ProfileForm`, `/map`); A/B test.

**Out:** meeting-location columns; removing geo.ts client helpers; profile delete; `getPublicProfile`
rework; applying the migration to any DB (user's gated step).

## Architecture / Approach

DB boundary first, then service, then UI. Private columns leave `profiles` for an owner-only table;
the JS geo filter is replaced by a definer RPC emitting only IDs; the public read path and client map
are behavior-unchanged. `cityCenter`/`CITY_CENTERS` stay in JS for client pin placement.

## Phases at a Glance

| Phase | Delivers | Key risk |
| --- | --- | --- |
| 1. Migration + RPC + A/B test | Owner-only table, data move, discovery RPC, regression test | RPC must faithfully reproduce `withinDiscoveryRadius`; unverifiable locally |
| 2. Service + types | `Profile` public, `getOwnLocation`, `upsertProfile` split, `listOwners` via RPC | Silent discovery regression if RPC semantics drift |
| 3. UI / API wiring | `/profile`, `ProfileForm`, `/map` sourced from `getOwnLocation` | Own pin/street must still save + reload |

**Prerequisites:** none to write; **GREEN requires the migration applied to a Postgres** (test DB) — no local Docker.
**Estimated effort:** ~1–2 sessions across 3 phases; verification gated on the user's test-DB apply.

## Open Risks & Assumptions

- RPC distance math + `unaccent` normalization are unverifiable locally — must be seen GREEN on the test DB before prod (the top risk: a silent discovery regression).
- `unaccent` folds `ł→l` (slightly more lenient than JS `cityCenter`); benign, doesn't affect unit tests.
- Assumes `profiles`/`profile_locations` both exist on any DB before apply (baseline migrations present).

## Success Criteria (Summary)

- A non-owner cannot read another user's street/GPS via the Data API (A/B test GREEN on the test DB).
- Discovery returns the same owners as today; own profile edit + map anchor still work.
- `npm run build`, `npm run lint`, unit tests stay green; no coords in `/map` or `/pack` client payloads.
