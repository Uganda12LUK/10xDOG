# Desktop layout for /owners map view — Plan Brief

> Full plan: `context/changes/ui-owners-desktop-layout/plan.md`
> Research: `context/changes/ui-owners-desktop-layout/research.md`

## What & Why

The `/owners` map view is mobile-first at all widths: a tall, full-width map pushes the filtered
results list off-screen on desktop, so applying a filter shows no visible change without scrolling.
This plan adds a desktop two-pane layout (sticky map + scrollable results) and tokenizes the map
marker colors. Mobile is unchanged.

## Starting Point

`OwnersMapView.tsx:66-85` renders one column everywhere — filters, a fixed-px map
(`h-[260px] md:h-[380px]`), a `divide-y` results list, and a bottom sheet. The same `filtered`
array (`:64`) already feeds both map and list, so the fix is purely presentational. The app has no
other desktop breakpoints today.

## Desired End State

On desktop, `/owners` shows the map in a sticky, viewport-tall left pane and the filtered results in
a scrollable right column; a filter change updates the list in view. Dog detail opens as a right
panel on desktop and a bottom sheet on mobile. No color literals remain in the markers; the home
pin uses a new theme-aware `--user-pin` token. Mobile layout is untouched.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Desktop layout | Two-pane: sticky map + scrollable list | Filter results visible without scrolling — directly fixes the symptom | Research |
| Map pane height | Sticky, `calc(100svh − chrome)` | Map stays in frame; definite height avoids Leaflet grey-box (no `invalidateSize`) | Plan |
| Dog detail on desktop | Responsive `Sheet` side via new `useMediaQuery` | Smallest diff, reuses the Sheet, matches the `lg:` split | Plan |
| Home-marker color | New `--user-pin` token (light + dark) | No blue token exists; keeps "no literals" and theme-awareness | Plan |
| i18n of PL strings | Out of scope | Owned by the separately-deferred 5.3 PL↔EN work | Research |

## Scope

**In scope:**
- Two-pane `lg:` layout in `OwnersMapView` (sticky map pane, scrollable list column)
- `useMediaQuery` hook + responsive `Sheet` side (bottom↔right)
- `--user-pin` token in `global.css` + marker/circle literal swaps in `DogMap`
- 7-state matrix, desktop+mobile screenshots, CLAUDE.md guard rule

**Out of scope:**
- i18n of hardcoded PL strings (deferred 5.3)
- `/meetings` tabs desktop layout (separate /10x-ui change)
- Desktop `BottomNav` chrome; any data/service/API/query change; pixel-regression tooling

## Architecture / Approach

Presentational only. Phase 1 adds the token and swaps `DogMap` literals. Phase 2 wraps map + list in
a responsive grid (`lg:grid-cols-[1fr_380px]`), gives the map pane an explicit sticky height, and
adds `useMediaQuery` to drive `Sheet` side. Phase 3 proves the state matrix, captures the visual
gate, and leaves the rule. Same `filtered` feeds both panes; no state change.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Marker tokens | `--user-pin` token + DogMap literals → tokens | `pathOptions.color` is an SVG attr, not CSS var — needs a computed-style read |
| 2. Two-pane layout | Responsive grid, sticky map, responsive Sheet side | Map pane without a definite height renders grey (Leaflet no `invalidateSize`) |
| 3. States + gate + rule | 7-state matrix, screenshots, CLAUDE.md UI block | Runtime verification needs build+preview (dev server blocked locally) |

**Prerequisites:** build+preview works (dev server is blocked locally — see project memory); a test account with a city set to reach `/owners`.
**Estimated effort:** ~1 session across 3 small phases.

## Open Risks & Assumptions

- The `calc(100svh − chrome)` value must account for Topbar + desktop `BottomNav`; tune against the real rendered heights.
- `useMediaQuery` must return `false` on first client render so mobile doesn't flash a right panel.
- Runtime/manual gates depend on build+preview (astro dev crashes locally); unit side has nothing new to run.

## Success Criteria (Summary)

- On desktop, changing a filter updates the visible results list without scrolling, with the map still in view.
- Dog detail opens from the right on desktop and the bottom on mobile; mobile layout is otherwise unchanged.
- No palette/hex color literals remain in the map markers; the home pin is theme-aware.
