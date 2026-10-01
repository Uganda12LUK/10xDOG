---
change_id: i18n-and-dog-map
title: PL/EN language switcher, dog-first map, breed dropdown, dashboard width
status: implemented
created: 2026-09-30
updated: 2026-10-01
archived_at: null
---

## Notes

Batch of four UX changes from live-app feedback. Approved design lives in `design.md` (this folder). i18n is the architectural core; map/filter/dashboard are bounded. See `design.md` for the phased rollout and the "not doing" list.

## Epilogue

All 7 phases implemented; lint + build green throughout. Shipped two follow-up
phases beyond the original design: **p6** (i18n gap closure — auth page chrome +
public landing, `<html lang>`) and **p7** (dogs anchored to their owner's town via
`src/lib/geo.ts` + region-aware `listOwners`, superseding the design's "offsets from
one center" note). Manual steps verified via curl where public, user-accepted for
logged-in/map flows. Demo data update lives in `supabase/rzeszow-testdata.sql` (not a
migration — paste into the SQL editor on a fresh environment).
