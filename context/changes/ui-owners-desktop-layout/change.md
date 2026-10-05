---
change_id: ui-owners-desktop-layout
title: Desktop layout for /owners map view — two-pane map + results
status: implementing
created: 2026-10-05
updated: 2026-10-05
archived_at: null
---

## Notes

/10x-ui change. **One view:** `/owners` (`src/components/map/OwnersMapView.tsx`, with
`DogMap.tsx`, `BottomSheet.tsx`, `SearchFilters.tsx`). **Token source:** `src/styles/global.css`
(Tailwind v4 `@theme` + shadcn tokens). **Components:** `src/components/ui/`.

Symptom (desktop/browser only; mobile looks fine): the view is a single vertical stack at all
widths — filters → fixed-height map (`h-[260px] md:h-[380px]`) → results list below → bottom
sheet. On desktop the tall full-width map pushes the filtered results off-screen, so filtering
shows no visible change without scrolling.

### Pre-audit charges (land in research.md ## Charges)

1. **Accidental architecture (headline):** `OwnersMapView.tsx:66-85` — no desktop layout; map
   and list stacked at all widths. User can't see filter results without scrolling on desktop.
2. **Arbitrary value / layout:** `OwnersMapView.tsx:70` — `h-[260px] md:h-[380px]` fixed px
   height; map can't share the viewport with a scrollable list beside it.
3. **Accidental architecture:** `BottomSheet.tsx` + `OwnersMapView.tsx:86` — `Sheet
   side="bottom"` (mobile pattern) used on desktop too; dog detail slides from the bottom.
4. **Missing tokens:** `DogMap.tsx:17,83` — literal `#2563eb`, `#fff`, `rgba(0,0,0,.3)`,
   `#e05c2e` in marker HTML / pathOptions instead of tokens.

### Scope decisions (from user)

- **Desktop layout = two-pane** (confirmed): on `lg:` a sticky full-height map pane beside a
  scrollable results column; mobile keeps the current stack. Covers charges 1-3.
- **Marker colors → tokens (charge 4) IS in scope** this change.
- **i18n (deferred, NOT in scope):** hardcoded PL strings `OwnersMapView.tsx:48`,
  `BottomSheet.tsx:39,43` — belongs to the separately-deferred 5.3 PL↔EN work.
- Sibling view `/meetings` tabs desktop layout is a **separate** future /10x-ui change.
