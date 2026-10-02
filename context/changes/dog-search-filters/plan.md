# Implementation Plan: Multi-criteria dog search (breed, size, character, approximate distance)

## Overview

Add multi-criteria discovery to the existing dog map at `/owners`: filter dogs by breed (exists), size, character traits, and approximate distance from the user's town. Introduces two new dog-profile fields (`size`, `traits`) and a reusable, unit-tested filtering core. Distance is approximate — computed between city centers in `src/lib/geo.ts` (no real GPS/geocoding).

## Current State

- **Dogs table** (`supabase/migrations/20260924090001_create_dogs.sql`): `id, owner_id, name, breed, birthdate, photo_path, timestamps`. Granular RLS; `set_updated_at` trigger reused across tables. No size/character columns.
- **Types** (`src/types.ts:19` `Dog`, `:54` `DogInput`, `:36` `DogWithOwner` — already carries `ownerCity`).
- **Service** (`src/lib/services/dog.ts`): `DogRow` interface (`:6`), `mapRow` (`:17`), `createDog` (`:85`), `updateDog` (`:120`).
- **Form** (`src/components/dogs/DogForm.tsx`): name (FormField), breed (`<select>` from `BREEDS`), birthdate, photo. Posts multipart to `/api/dogs` or `/api/dogs/:id`.
- **API** (`src/pages/api/dogs/index.ts` create, `[id].ts` update): zod `dogSchema`, parses `formData`, calls service.
- **Map** (`src/components/map/OwnersMapView.tsx`): client-side breed filter via `BreedSelect` (`src/components/map/BreedSelect.tsx`); `filtered` feeds both `DogMap` pins and the list. `center = CITY_CENTERS[city]`. Dogs loaded via `listDogsForMap` (`src/lib/services/profile.ts`).
- **Geo** (`src/lib/geo.ts`): `CITY_CENTERS`, `citiesNear()`. No distance helper.
- **Tests**: vitest configured (change `testing-bootstrap-critical-path`).

## Desired End State

An owner on `/owners` sees a filter panel (breed, size, character, distance) above the map. Selecting criteria narrows pins and the list together. Dog profiles capture size (one of small/medium/large) and traits (multi-select from a fixed vocabulary). Filtering is a pure, tested function.

## What We're NOT Doing

- No real GPS or address geocoding; distance stays city-center approximate.
- No server-side filtering — all filtering is client-side over the region's dogs (small set).
- No breeding loop (S-06…S-08), no search surface other than `/owners`.
- No GIN index on `traits` (client-side filter doesn't query it).
- No backfill of existing dogs' size/traits (they stay null/empty until the owner edits).

## Critical Implementation Details

- `traits` is stored as stable **keys** (6 positive/neutral + 4 cautionary: `reactive`, `anxious`, `dominant`, `barky`), never localized text — the UI translates keys via `t()`.
- A dog with `size = null` or empty `traits` is only excluded when the corresponding filter is **active**; with no filter it still shows.
- Distance filter default is **no limit** (all region dogs shown on load). A dog whose `ownerCity` is absent from `CITY_CENTERS` is excluded only when a distance limit is active.

---

## Phase 1: Data layer (schema, types, vocab, service)

### Changes Required

**1. New migration** `supabase/migrations/<ts>_add_dog_attributes.sql`
- **Intent**: Add the two new nullable attributes so existing rows remain valid.
- **Contract**: `alter table dogs add column size text check (size in ('small','medium','large')); alter table dogs add column traits text[] not null default '{}';` No RLS change (existing policies cover all columns).

**2. Shared vocab** `src/lib/dogAttributes.ts` (new)
- **Intent**: One source of truth for allowed sizes and traits, imported by form, API validation, and filter.
- **Contract**: `DOG_SIZES = ['small','medium','large']`; `DOG_TRAITS` = 6 positive/neutral (`energetic, calm, social, shy, dog_friendly, kid_friendly`) + 4 cautionary (`reactive, anxious, dominant, barky`), with `DogSize` / `DogTrait` derived types. (Cautionary traits added in Phase 2 on user request so a challenging dog can be described and filtered out.)

**3. Types** `src/types.ts`
- **Intent**: Carry the new fields through `Dog` and `DogInput`.
- **Contract**: `Dog` gains `size: DogSize | null` and `traits: string[]`. `DogInput` gains `size?: DogSize | null` and `traits?: string[]`. `DogWithOwner` inherits them automatically.

**4. Service** `src/lib/services/dog.ts`
- **Intent**: Persist and read the new columns.
- **Contract**: `DogRow` gains `size: string | null` and `traits: string[]`. `mapRow` maps both (`traits: row.traits ?? []`). `createDog` insert and `updateDog` row object include `size: input.size ?? null` and `traits: input.traits ?? []`.

### Success Criteria

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- Migration applied to the live DB (SQL editor); `dogs` has `size` + `traits` columns

---

## Phase 2: Write path (form + API)

### Changes Required

**1. Dog form** `src/components/dogs/DogForm.tsx`
- **Intent**: Let owners set size (single) and traits (multiple). Follow the existing breed `<select>` pattern for size; render traits as a group of toggle chips/checkboxes.
- **Contract**: New state `size` (string) and `traits` (string[]). Size `<select name="size">` with options from `DOG_SIZES` (labels via `t()`). Traits rendered as checkboxes named `traits` (multiple values) from `DOG_TRAITS`, pre-checked from `dog?.traits`. Both seeded from the `dog` prop on edit.

**2. Create API** `src/pages/api/dogs/index.ts`
- **Intent**: Validate and pass the new fields.
- **Contract**: `dogSchema` gains `size: z.enum(DOG_SIZES).nullable().optional()` (empty string → null) and `traits: z.array(z.enum(DOG_TRAITS)).default([])`. Read `form.get('size')` and `form.getAll('traits')`. Pass to `createDog`.

**3. Update API** `src/pages/api/dogs/[id].ts`
- **Intent**: Mirror the create validation + pass-through on edit.
- **Contract**: Same schema additions; `form.getAll('traits')`; pass `size` + `traits` to `updateDog`.

### Success Criteria

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- Creating a dog with a size and 2 traits persists them (visible after reload / in edit form)
- Editing a dog to change size and toggle traits persists the change
- Submitting with no size and no traits still succeeds (fields optional)

---

## Phase 3: Filtering core (distance helper + pure function + tests)

### Changes Required

**1. Distance helper** `src/lib/geo.ts`
- **Intent**: Approximate km between two coordinates.
- **Contract**: `export function distanceKm(a: [number, number], b: [number, number]): number` — haversine, returns kilometers.

**2. Pure filter** `src/lib/dogFilter.ts` (new)
- **Intent**: One testable function deciding which dogs match the active criteria; used by the map so UI stays thin.
- **Contract**: `export interface DogFilterCriteria { breed: string | null; size: DogSize | null; traits: string[]; maxKm: number | null }` and `export function filterDogs(dogs: DogWithOwner[], criteria: DogFilterCriteria, userCenter: [number, number]): DogWithOwner[]`. Rules: breed exact match when set; size exact when set; traits = dog must include **all** selected traits (AND); distance = when `maxKm` set, keep dogs whose `ownerCity` resolves in `CITY_CENTERS` and `distanceKm(userCenter, center) <= maxKm` (unknown city excluded). Empty/`null` criteria don't filter.

**3. Unit tests** `src/lib/dogFilter.test.ts` (new)
- **Intent**: Lock the filter semantics (the one risk worth a test).
- **Contract**: Cover: no criteria → all; breed narrows; size narrows; multi-trait AND; distance keeps near / drops far / drops unknown-city; combined criteria intersect.

### Success Criteria

#### Automated Verification:
- `npx vitest run src/lib/dogFilter.test.ts` passes
- `npm run lint` passes

#### Manual Verification:
- (none — pure logic covered by the unit test)

---

## Phase 4: Map filter UI

### Changes Required

**1. Filter panel** `src/components/map/SearchFilters.tsx` (new) + `OwnersMapView.tsx`
- **Intent**: Surface breed + size + traits + distance above the map; drive one `criteria` state that feeds `filterDogs`. Reuse the `BreedSelect` visual pattern.
- **Contract**: `OwnersMapView` holds `criteria` state (`DogFilterCriteria`), computes `filtered = filterDogs(dogs, criteria, center)`, passes `filtered` to both `DogMap` and the list (replacing the current `selectedBreed`-only logic). `SearchFilters` renders: breed `<select>` (existing options), size `<select>` (`DOG_SIZES`), trait toggle chips (`DOG_TRAITS`), distance `<select>` (5/10/25/50 km + "no limit", default null). Labels via `t()`.

### Success Criteria

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- Selecting a size narrows pins + list together; clearing restores
- Selecting 2 traits shows only dogs having both
- Distance "10 km" drops far-town dogs; "no limit" restores
- Breed + size + distance combined intersect correctly

---

## Phase 5: i18n + demo data + final verification

### Changes Required

**1. i18n** `src/lib/i18n/pl.ts` + `en.ts`
- **Intent**: Translate every new user-visible filter label.
- **Contract**: Keys for filter labels (`filter.size`, `filter.character`, `filter.distance`, `filter.anySize`, `filter.distanceNoLimit`, `filter.km`). Parallel keys in both files.
- **Note**: dog-form + `size.*` + `trait.*` keys were pulled forward into **Phase 2** so the add-dog form reads Polish during its own verification. The same pass fixed pre-existing hardcoded English across the dog surface: `DogForm` (placeholder, "Select a breed", "Saving…", name-required), `dogs/new.astro` (title + "Add a dog" heading), and `dogs/index.astro` ("Saved.", empty-state, "yrs"). The browser-native `<input type=file>` "Choose file" label is NOT localizable via HTML and is left as-is.

**2. Demo data** `supabase/rzeszow-testdata.sql`
- **Intent**: Give the 5 demo dogs size + traits so the filter demonstrably narrows.
- **Contract**: Extend section 3's insert with `size` + `traits` columns and `on conflict (id) do update set size = excluded.size, traits = excluded.traits;` so re-running updates existing demo rows. Spread values across sizes/traits (e.g. Border Collies = medium/energetic+dog_friendly; Beagle = small/social).

### Success Criteria

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- PL↔EN toggles all new filter + form labels
- After running the updated testdata SQL, demo dogs carry size/traits and the filters narrow them
- No untranslated raw keys visible in either language

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Data layer

#### Automated
- [x] 1.1 `npm run lint` passes — 3a639be
- [x] 1.2 `npm run build` passes — 3a639be

#### Manual
- [x] 1.3 Migration applied to live DB; `dogs` has `size` + `traits` columns — 3a639be

### Phase 2: Write path

#### Automated
- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npm run build` passes

#### Manual
- [x] 2.3 Creating a dog with size + 2 traits persists them
- [x] 2.4 Editing size + toggling traits persists
- [x] 2.5 Submitting with no size and no traits still succeeds

### Phase 3: Filtering core

#### Automated
- [ ] 3.1 `npx vitest run src/lib/dogFilter.test.ts` passes
- [ ] 3.2 `npm run lint` passes

### Phase 4: Map filter UI

#### Automated
- [ ] 4.1 `npm run lint` passes
- [ ] 4.2 `npm run build` passes

#### Manual
- [ ] 4.3 Size filter narrows pins + list together; clearing restores
- [ ] 4.4 Two traits → only dogs having both
- [ ] 4.5 Distance 10 km drops far-town dogs; no-limit restores
- [ ] 4.6 Breed + size + distance combined intersect correctly

### Phase 5: i18n + demo data

#### Automated
- [ ] 5.1 `npm run lint` passes
- [ ] 5.2 `npm run build` passes

#### Manual
- [ ] 5.3 PL↔EN toggles all new filter + form labels
- [ ] 5.4 Demo dogs carry size/traits and filters narrow them
- [ ] 5.5 No untranslated raw keys visible in either language
