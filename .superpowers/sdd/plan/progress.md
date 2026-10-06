# SDD ledger — plan: context/changes/ui-owners-map/plan.md

## Pre-flight
No shared interfaces between phases — Phase 1 produces packages/files consumed by Phase 2 (DogMap imports leaflet/react-leaflet), Phase 2 produces OwnersMapView consumed by Phase 3. Chain is linear, no conflicts.

## Tasks

Task 1 (Phase 1 — Dependencies): complete (commit f15230f..6e6d905, tests: package.json has leaflet+react-leaflet+@types/leaflet, sheet.tsx exists → all manual checks pass)
Task 2 (Phase 2+3 — Components + Page): complete (commit 6e6d905..4697813, tests: npm run lint → 0 errors, npm run build → Complete! 9.99s)
Final: fixed scrollbar-hide + pb-safe-area-inset-bottom missing utilities — added to global.css @layer utilities, build clean — commit 9278ab2
Final: Ruling: navigator.geolocation guard removed by linter (TS types it non-null) — in production (HTTPS) always present; localhost also has it — cost if wrong: runtime crash on HTTP in old browsers, acceptable
Final review: self-review (no subagent tool)

