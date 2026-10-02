# Plan Brief: Multi-criteria dog search

> Full plan: [`plan.md`](./plan.md) · Change: `dog-search-filters` · Status: planned

## What & why

Discovery on `/owners` only filters by breed today. Owners want to find compatible dogs by **breed + size + character + distance from me**. This adds two dog-profile fields (`size`, `traits`) and a multi-criteria filter panel on the existing map — pins and list narrow together. Distance is approximate (city-center to city-center), consistent with the project's deliberate "no real geolocation" stance.

## Starting point

- Dogs: `id, owner_id, name, breed, birthdate, photo_path` — no size/character.
- `/owners` map: client-side **breed** filter (`BreedSelect`) feeding both pins (`DogMap`) and list; dogs loaded via `listDogsForMap` and already carry `ownerCity`.
- `src/lib/geo.ts` has `CITY_CENTERS` + `citiesNear()` (region grouping from the prior change) but no distance helper.
- vitest is configured.

## Key decisions

| Decision | Choice | Why |
|----------|--------|-----|
| New fields | `size` (enum small/medium/large, nullable) + `traits` (`text[]` of keys) | Filterable, translatable; nullable keeps existing rows valid |
| Trait vocabulary | 6 keys: energetic, calm, social, shy, dog_friendly, kid_friendly | Covers playdate matching; short = easy to fill |
| Trait storage | stable keys, never localized text | UI translates via `t()` |
| Where search lives | extend existing `/owners` map | One discovery surface; reuses pins+list wiring |
| Filtering | client-side pure function `filterDogs()` | Region returns few dogs; no server queries needed; testable |
| Distance | approximate, haversine between `CITY_CENTERS`; options 5/10/25/50 km + no-limit; **default no-limit** | No GPS; nothing hidden on load |
| Trait match | AND (dog must have all selected) | Precise compatibility narrowing |
| Unknown-city dog | excluded only when a distance limit is active | Predictable, no silent drops by default |
| Tests | only `filterDogs` (vitest) | The one real logic risk; rest is UI |

## Phases

| # | Phase | Touches | Gate |
|---|-------|---------|------|
| 1 | Data layer | migration, `types.ts`, new `dogAttributes.ts`, `services/dog.ts` | lint+build; migration applied |
| 2 | Write path | `DogForm.tsx`, `api/dogs/index.ts` + `[id].ts` | lint+build; persist on create+edit |
| 3 | Filtering core | `geo.ts` (`distanceKm`), new `dogFilter.ts` + `dogFilter.test.ts` | vitest green |
| 4 | Map filter UI | new `SearchFilters.tsx`, `OwnersMapView.tsx` | lint+build; filters narrow pins+list |
| 5 | i18n + demo data | `i18n/pl.ts`+`en.ts`, `rzeszow-testdata.sql` | lint+build; PL/EN + demo narrows |

**Prerequisites:** none (builds on current `/owners` + `geo.ts`). The Phase 1 migration + Phase 5 demo data are live-DB SQL pastes (not auto-applied). **Estimated effort:** ~5 focused phases, each a small vertical slice.

## Not doing

Real GPS/geocoding · server-side filtering · breeding loop · search outside `/owners` · GIN index on traits · backfilling existing dogs' attributes.

## References

- `plan.md` (this change) · `change.md` (approved design in Notes)
- `src/lib/services/dog.ts`, `src/components/dogs/DogForm.tsx`, `src/pages/api/dogs/{index,[id]}.ts`
- `src/components/map/{OwnersMapView,DogMap,BreedSelect}.tsx`, `src/lib/geo.ts`
- `supabase/migrations/20260924090001_create_dogs.sql` (migration pattern), `supabase/rzeszow-testdata.sql`
