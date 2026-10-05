---
date: 2026-10-05T20:48:02+02:00
researcher: lmajers
git_commit: a988b5c774232d2c5062e8d0298226cbf6eb4704
branch: main
repository: Lekcja_1_DOGFB
topic: "Desktop/browser layout for the /owners map view — two-pane map + results, responsive, token-clean"
tags: [research, codebase, owners, map, leaflet, responsive, tokens]
status: complete
last_updated: 2026-10-05
last_updated_by: lmajers
---

# Research: Desktop layout for the /owners map view

**Date**: 2026-10-05T20:48:02+02:00
**Researcher**: lmajers
**Git Commit**: a988b5c774232d2c5062e8d0298226cbf6eb4704
**Branch**: main
**Repository**: Lekcja_1_DOGFB

## Research Question

The `/owners` view looks fine on mobile but is broken on desktop/browser: a tall,
full-width map pushes the filtered results list off-screen, so applying a filter shows
no visible change without scrolling. What layout, Leaflet, component, and token facts
must a two-pane desktop layout (sticky map + scrollable results) be built on, and what
breaks if we naively add breakpoints?

## Summary

- The view is a **single mobile-first vertical stack at all widths** — there is no
  `lg:`/`md:` two-pane branch anywhere in `OwnersMapView.tsx`. The map is a fixed-px-height
  full-width block, the results are a `divide-y` list directly below it
  (`OwnersMapView.tsx:66-85`). This is the headline cause of the symptom.
- The app has **essentially no desktop breakpoints today**: an app-wide grep found one
  responsive grid (`dashboard.astro:105` `grid-cols-2 md:grid-cols-4`) and otherwise no
  `lg:grid` / `lg:flex` / `lg:sticky` / `100vh` / `calc(100vh…)` usage in `src/` (excluding
  `.scaffold` files and the vendored `ui/tabs.tsx`). So a desktop layout for `/owners` is a
  net-new pattern, not an extension of an existing one.
- `Layout.astro` imposes **no max-width container** — `<slot/>` is edge-to-edge inside
  `bg-background min-h-screen` (`Layout.astro:45-49`), so full desktop width is available for
  two panes. Caveat: the mobile `BottomNav` also renders on desktop and the wrapper reserves
  `pb-[70px]` for it when logged in (`Layout.astro:45,51`); any `100vh`-based map height must
  subtract Topbar + that bottom bar or it will overflow.
- **Leaflet never calls `invalidateSize()`** (grep: 0 hits in `src/`). `MapContainer` fills
  its parent via `style={{ height:"100%", width:"100%" }}` (`DogMap.tsx:72`) and reads that
  size **once at mount**. The view mounts `client:only="react"` (`owners/index.astro:55`), so
  it mounts at the current viewport with no SSR box. **Implication:** the two-pane map pane
  must have a *definite* height at mount (an explicit `h-…`/`calc`), not an auto-height flex
  child — a `height:100%` map inside an unsized flex/grid cell collapses to 0 and renders a
  grey tile box. No `invalidateSize` is needed for sticky positioning (sticky does not resize
  the box); it *would* be needed only if we toggled the layout without remount, which a CSS
  breakpoint does not do.
- The dog-detail surface is a **bottom Sheet used at all widths** (`OwnersMapView.tsx:86-92`,
  `BottomSheet.tsx:14-20` with `side="bottom"`). `SheetContent`'s `side` is a **JS prop, not a
  responsive class** (`ui/sheet.tsx:35-61`): the per-side classes are chosen in JS, so Tailwind
  breakpoints cannot switch it. There is **no `useMediaQuery` hook and no `matchMedia` usage**
  anywhere (grep: 0 hits), and `src/components/hooks/` does not exist yet. Switching
  bottom→side by viewport therefore needs a new client hook (CLAUDE.md convention:
  "Extract hooks to `src/components/hooks/`").
- Charge-4 marker colors are **inline styles inside `L.divIcon` HTML**, not Tailwind classes
  (`DogMap.tsx:17,27`) — and `var(--color-primary,…)` already resolves there today
  (`DogMap.tsx:27`), proving `var(--color-*)` works inside divIcon HTML. The literals to
  replace: home-marker `#2563eb` + `#fff` (`:17`), dog-marker fallback `#e05c2e` (`:27`),
  radius Circle `#e05c2e` (`:83`). There is **no blue semantic token**: the palette is warm
  coral (`--primary #C4461F`) plus `--accent` (warm `#FBEDE7`), `--success` (green), `--warning`,
  `--destructive` (`global.css:29,39,45`). The home marker is intentionally blue to stand apart
  from the coral dog pins, so there is no existing token that preserves that contrast.

## Detailed Findings

### OwnersMapView — the layout (headline charges 1 & 2)

- `OwnersMapView.tsx:66-85`: returns `<div class="relative">` → `SearchFilters` →
  `<div class="px-0 md:px-4"><div class="isolate h-[260px] overflow-hidden md:h-[380px] md:rounded-2xl"><DogMap/></div></div>`
  → `<div class="divide-border divide-y">{filtered.map(DogCard)}</div>` → `BottomSheet`.
  Everything is one column; the only responsive tokens are padding/radius/height bumps
  (`md:px-4`, `md:h-[380px]`, `md:rounded-2xl`) — **no two-pane split**.
- Map height is an **arbitrary value** `h-[260px] md:h-[380px]` (`:70`) — charge 2. For the
  desktop pane this must become a definite height that fills the column (see Leaflet below).
- `filtered` (`:64`) already drives **both** the map pins and the list, so a two-pane layout
  needs no data change — the same `filtered` array feeds both panes; only the DOM arrangement
  changes.

### Leaflet / DogMap resize behavior (the main implementation risk)

- `DogMap.tsx:72` `MapContainer … style={{ height:"100%", width:"100%" }}` — fills parent.
- No `invalidateSize()` in `src/` (grep: 0 hits). `FitToDogs` (`DogMap.tsx:44-56`) runs
  `setView`/`fitBounds` on mount and when `positions`/`center` change, but that recomputes the
  *geographic* view, not the pixel size.
- `owners/index.astro:55` mounts `OwnersMapView` with `client:only="react"` — client-only, so
  the map initializes at the real viewport.
- **Risk & mitigation for the plan:** give the desktop map pane an explicit height
  (e.g. `lg:h-[calc(100vh-<chrome>)]` or a fixed tall `lg:h-[640px]`) and keep the mobile
  `h-[260px]`. Do **not** rely on `flex-1`/`items-stretch` alone to size the map — an
  auto-height parent makes `height:100%` resolve to 0. If a definite height is in place at
  mount, no `invalidateSize` is required.

### Dog-detail surface (charge 3)

- `OwnersMapView.tsx:86-92` renders `<BottomSheet>` unconditionally; `BottomSheet.tsx:20` uses
  `side="bottom"`.
- `ui/sheet.tsx:38,52-59`: `side` defaults to `"right"` and each side's fixed classes
  (`inset-y-0 right-0 … w-3/4 sm:max-w-sm` for right; `inset-x-0 bottom-0 h-auto` for bottom)
  are applied by a JS `side === …` check — **not responsive**.
- Two viable approaches (decide in `/10x-plan`):
  - **(A) Media-query `side` switch (recommended):** add `src/components/hooks/useMediaQuery.ts`,
    compute `const isDesktop = useMediaQuery("(min-width: 1024px)")`, pass
    `side={isDesktop ? "right" : "bottom"}`. Smallest change, reuses the Sheet, matches the
    `lg:` breakpoint used for the two-pane split. Hook must return a stable value on first
    client render (default to mobile/bottom) to avoid a flash.
  - **(B) Desktop inline panel:** on `lg:` drop the Sheet and render the selected dog inside
    the results column; keep the Sheet for mobile only. More structural; larger diff.

### Tokens (charge 4)

- `global.css:21-54` (`:root`) and `:75-104` (`.dark`) hold raw values; `@theme inline`
  (`:122-150`) publishes them as `--color-*`. `--color-primary` is live and already used by the
  dog marker (`DogMap.tsx:27`).
- Replacements with existing tokens: dog-marker fallback `#e05c2e` → drop to bare
  `var(--color-primary)`; Circle `#e05c2e` (`:83`) → `var(--color-primary)`; glyph `#fff` →
  `var(--color-primary-foreground)` (=`#FFFFFF` light).
- **Gap — home-marker blue:** no blue token exists. Options for the plan: (a) add a semantic
  pair `--user-pin` / `--user-pin-foreground` in `:root` + `.dark`, publish via `@theme inline`
  as `--color-user-pin*`, and reference it in the divIcon; or (b) record the single blue literal
  as a documented one-off exception in the agent rule. The contract favors (a) since charge 4
  is explicitly in scope.
- Shadows `rgba(0,0,0,.3)/.25` (`:17,27`) are drop-shadows on the pins; `--shadow-card` exists
  but is a card elevation, not a pin shadow. Low value to tokenize; treat as optional/deferred.

## Code References

- `src/components/map/OwnersMapView.tsx:66-85` — single-column stack; no desktop two-pane (charges 1-2).
- `src/components/map/OwnersMapView.tsx:70` — `h-[260px] md:h-[380px]` arbitrary map height (charge 2).
- `src/components/map/OwnersMapView.tsx:64` — `filtered` feeds both map and list (no data change needed).
- `src/components/map/OwnersMapView.tsx:86-92` — unconditional bottom Sheet (charge 3).
- `src/components/map/DogMap.tsx:72` — `MapContainer` height/width 100%, fills parent; no `invalidateSize`.
- `src/components/map/DogMap.tsx:17,27,83` — marker/circle color literals (charge 4).
- `src/components/map/BottomSheet.tsx:14-20` — `Sheet side="bottom"`.
- `src/components/ui/sheet.tsx:35-61` — `side` is a JS prop; per-side classes are non-responsive.
- `src/pages/owners/index.astro:55` — `client:only="react"`; `:42-53` is the no-city empty state.
- `src/layouts/Layout.astro:45-51` — edge-to-edge slot, `min-h-screen`, `pb-[70px]`, desktop BottomNav.
- `src/styles/global.css:21-54,75-104,122-150` — token source (`:root`, `.dark`, `@theme inline`).
- `src/pages/dashboard.astro:105` — the only other responsive grid in the app.

## Architecture Insights

- **Mobile-first with no desktop tier is systemic**, not specific to `/owners` (one responsive
  grid app-wide). Scope here stays on `/owners`; the sibling `/meetings` tabs desktop issue is a
  separate /10x-ui change, and the desktop BottomNav is nav chrome, out of this view's scope.
- `var(--color-*)` resolves inside Leaflet `divIcon` HTML (proven by the live dog marker), so
  charge 4 is a literal→token swap, not a re-architecture.
- The data path already produces one `filtered` list for both surfaces, so the layout change is
  presentational only.

## Historical Context (from prior changes)

- `context/changes/ui-owners-map/change.md` (status `implemented`) — the original Leaflet map +
  bottom-sheet + filter-chips build for this view; this change is a desktop-responsive follow-up,
  not a rebuild.
- `context/changes/dog-search-filters/plan.md` (status `implementing`) — added `SearchFilters` +
  `filterDogs`; its runtime gates (4.3-4.6) were blocked partly because filter effects are
  invisible on desktop without scrolling — the symptom this change fixes.
- `context/foundation/lessons.md:5-10` — "pre-scaffolding UI for a future slice must be annotated
  in the plan." Applies here: do **not** fold the `/meetings` tabs desktop work or nav changes
  into this change; keep it to `/owners`.

## Related Research

- None prior for this change. Adjacent: `context/changes/ui-owners-map/` (no research.md),
  `context/changes/meetings-ui-tokens/` (token migration precedent for the sibling view).

## Open Questions

- **Dog-detail on desktop:** approach (A) media-query `side` switch vs (B) inline panel — a
  `/10x-plan` decision. (A) recommended.
- **Home-marker token:** add a `--user-pin` semantic token (recommended) vs document a single
  blue literal exception.
- **Map pane height formula:** exact `calc(100vh - chrome)` value vs a fixed `lg:h-[…]`; depends
  on whether the map should be viewport-tall (sticky) or a bounded panel. Resolve against the
  Topbar + BottomNav heights in `/10x-plan`.
