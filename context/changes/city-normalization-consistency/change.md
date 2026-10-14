---
change_id: city-normalization-consistency
title: Route all city→center lookups through cityCenter() (case/diacritic-insensitive)
status: implemented
created: 2026-10-14
updated: 2026-10-14
archived_at: null
---

## Notes

Scope-cut item #3 from the 2026-10-14 review (see
`context/changes/owner-location-privacy/frame.md`). Server discovery was fixed in
commit fac4c43 to normalize city strings, but three client/pure sites still index
`CITY_CENTERS[...]` directly, so diacritic/case variants ("Rzeszów" / "Rzeszow" /
"rzeszów") that pass the server scope can behave differently in the client filter or
on the map:

- `src/lib/dogFilter.ts:74` — distance filter
- `src/components/map/DogMap.tsx:35` — pin placement
- `src/components/map/OwnersMapView.tsx:76` — map anchor

Fix: route all three through the shared `cityCenter()` normalizer from `src/lib/geo.ts`
(folds case + diacritics, returns null for unknown/empty). Test-first regression in
`tests/unit/dogFilter.test.ts` for an ASCII variant ("Rzeszow").

Not doing: adding new cities to `CITY_CENTERS`; any server-side change (already done in
fac4c43).
