---
change_id: dog-search-filters
title: Multi-criteria dog search (breed, size, character, approximate distance)
status: implementing
created: 2026-10-02
updated: 2026-10-02
archived_at: null
---

## Notes

Enhancement to discovery (FR-004); not on the M-1 roadmap. Approved design from a
brainstorming session (2026-10-02):

- **New dog fields:** `size` (enum: small/medium/large, nullable) and `traits`
  (`text[]` of stable keys; vocab: energetic, calm, social, shy, dog_friendly,
  kid_friendly). Breed already exists. New migration + zod validation + dog form
  fields (size = single select, traits = multi-select chips).
- **Shared vocab module** `src/lib/dogAttributes.ts` (DOG_SIZES, DOG_TRAITS) used by
  both form and filter. `Dog` type in `types.ts` gains `size` + `traits`.
- **Search lives on the existing map** `/owners` (extend `OwnersMapView`): a filter
  panel (breed + size + character + distance) that narrows pins AND the list
  together. Client-side filtering (region returns few dogs — no server queries),
  consistent with the current breed filter.
- **Distance = approximate**: haversine `distanceKm()` helper in `geo.ts` between the
  user's city center and the owner's city center (from CITY_CENTERS). Slider options
  5/10/25/50 km / no limit. Accepted limitation: same-city ≈ 0 km; range already
  bounded by the `citiesNear` region.
- **Pure filter function** `filterDogs(dogs, criteria, userCenter)` in `src/lib/` —
  the one unit-tested piece (vitest). Rest is UI.
- **i18n** keys for filter labels, size names, trait names (PL/EN).
- **Demo data**: add size + traits to the 5 demo dogs in `rzeszow-testdata.sql`.

**Not doing:** real GPS/geocoding, server-side filtering, the breeding loop, search
anywhere other than `/owners`.
