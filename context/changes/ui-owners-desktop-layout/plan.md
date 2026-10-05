# Desktop layout for /owners map view — Implementation Plan

## Overview

Make the `/owners` map view usable on desktop by replacing its single mobile-first column
with a two-pane layout on `lg:` — a sticky, full-height map beside a scrollable results
column — so a filter change is visible in the list without scrolling. Also tokenize the
Leaflet marker colors. Mobile layout is unchanged. The change is presentational: the
`filtered` array already feeds both the map and the list.

## Current State Analysis

- `OwnersMapView.tsx:66-85` is one vertical column at all widths: `SearchFilters` → fixed-px
  map (`h-[260px] md:h-[380px]`, `:70`) → `divide-y` results list → `BottomSheet`. No `lg:`
  two-pane branch; the tall full-width map pushes results off-screen on desktop.
- `filtered` (`OwnersMapView.tsx:64`) drives both map pins and the list — no data change needed.
- Leaflet never calls `invalidateSize()` (0 hits in `src/`); `MapContainer` fills its parent via
  `height:100%/width:100%` (`DogMap.tsx:72`) and reads that size once at mount (`client:only`,
  `owners/index.astro:55`). A `height:100%` map inside an unsized flex/grid cell collapses to 0.
- `SheetContent.side` is a JS prop, not a responsive class (`ui/sheet.tsx:35-61`); no
  `useMediaQuery`/`matchMedia` exists and `src/components/hooks/` is absent.
- Marker/circle colors are literals inside `L.divIcon` inline styles (`DogMap.tsx:17,27,83`);
  `var(--color-primary,…)` already resolves there (`:27`). No blue semantic token exists
  (`global.css:29,39,45` — warm coral/accent/green/amber palette).
- `Layout.astro:45-51` has no max-width (full desktop width available), `min-h-screen`, and
  reserves `pb-[70px]` for a `BottomNav` that also renders on desktop.

### Key Discoveries:

- Two-pane is presentational only — same `filtered` feeds both panes (`OwnersMapView.tsx:64`).
- Map pane MUST carry a definite height at mount or Leaflet renders a grey box (`DogMap.tsx:72`).
- Responsive `Sheet` side needs a new client hook (`ui/sheet.tsx:35-61`, no hook dir today).
- `var(--color-*)` works in divIcon HTML (proven by `DogMap.tsx:27`) — charge 4 is a literal swap.

## Desired End State

On desktop (`lg:`), `/owners` shows the map in a sticky, viewport-tall left pane and the filtered
results in a scrollable right column; changing a filter updates the list in view without
scrolling. Selecting a dog opens a right-side panel on desktop and a bottom sheet on mobile. The
mobile layout (stacked map + list + bottom sheet) is unchanged. No color literals remain in the
map markers; the home marker uses a new `--user-pin` token that works in light and dark.

## What We're NOT Doing

- No i18n of the hardcoded PL strings (`OwnersMapView.tsx:48`, `BottomSheet.tsx:39,43`) — the
  deferred 5.3 PL↔EN work owns them.
- No desktop layout for the sibling `/meetings` tabs view — a separate /10x-ui change
  (`lessons.md:5-10`: do not fold a future slice in).
- No change to the desktop `BottomNav` chrome (`Layout.astro:51`) — nav concern, out of this view.
- No data/service/API/query change — filtering stays client-side over `filtered`. (Exception
  added mid-Phase-1 on user request: seed-only demo data in `supabase/rzeszow-testdata.sql` — no
  schema/app-code change.)
- No pixel-regression tooling install — the visual gate is a kitchen-sink screenshot.

## Implementation Approach

Follow the 10x-ui order: tokens → view → states. Phase 1 adds the `--user-pin` token and swaps
the DogMap literals. Phase 2 rebuilds `OwnersMapView` into a responsive two-pane grid (sticky
map pane with a definite height, scrollable list column) and adds a `useMediaQuery` hook to drive
`Sheet` side responsively. Phase 3 proves the 7-state matrix on the view, screenshots desktop +
mobile as the visual gate, and leaves a rule in `CLAUDE.md`.

## Critical Implementation Details

- **Map pane height is load-bearing.** The desktop map pane must have an explicit height
  (`lg:sticky lg:top-0` with `lg:h-[calc(100svh-<chrome>)]`), not `flex-1` on an auto-height row —
  otherwise Leaflet's `height:100%` resolves to 0 and renders grey. Use `svh` (small viewport) so
  mobile browser chrome doesn't clip it; mobile keeps `h-[260px]`. The two-pane split is CSS-only
  at the `lg:` breakpoint, so the map does not remount and no `invalidateSize()` is required.
- **`useMediaQuery` first render.** The hook must return a stable value on the first client render
  (default `false` → bottom sheet) and update after mount, so SSR-less `client:only` mounting
  doesn't flash a right panel on mobile.

## Phase 1: Marker tokens

### Overview

Replace the color literals in `DogMap` so markers are token-driven and theme-aware (charge 4).

> **Scope grew mid-phase (user feedback):** instead of a blue `--user-pin` token, the user-location
> marker is **redesigned** as a brand-coral teardrop pin with a white doghouse (buda) SVG glyph —
> distinct from the round dog pins by shape, colored via `--color-primary`/`--color-primary-foreground`
> (so the separate blue token was dropped). The radius circle becomes a dashed "leash" via the
> `.dog-radius` utility. Also seeds ~40 varied demo dogs in `supabase/rzeszow-testdata.sql` so the
> map/list/filters have volume to test (seed data only).

### Changes Required:

#### 1. Token source

**File**: `src/styles/global.css`

**Intent**: Introduce a semantic token for the user/home marker (intentionally blue, distinct
from the coral dog pins) in both themes, and publish it so `var(--color-user-pin)` exists.

**Contract**: Add `--user-pin` (+ `--user-pin-foreground`) to `:root` (light) and `.dark`, then a
`--color-user-pin` / `--color-user-pin-foreground` pair in the `@theme inline` block
(`global.css:122-150`), mirroring the existing `--primary` → `--color-primary` pattern. Light blue
≈ `#2563eb`; pick a dark-theme blue with adequate contrast on the pin.

#### 2. Map marker colors

**File**: `src/components/map/DogMap.tsx`

**Intent**: Remove the inline color literals from the divIcon HTML and the Circle, referencing
tokens instead (proven to resolve in divIcon by the existing dog marker).

**Contract**: `:17` home marker `background:#2563eb` → `var(--color-user-pin)`, `color/border #fff`
→ `var(--color-user-pin-foreground)`; `:27` dog marker drop the `#e05c2e` fallback to bare
`var(--color-primary)`, `color:#fff` → `var(--color-primary-foreground)`; `:83` Circle
`color:"#e05c2e"` → a CSS var read (`getComputedStyle` on `document.documentElement` for
`--color-primary`, since `pathOptions.color` is an SVG attribute, not CSS — or keep the coral via
the token value). Pin drop-shadows `rgba(0,0,0,.25/.3)` may stay (not a palette color).

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`
- Hardcoded-value scan shows no palette/hex literals in `DogMap.tsx` except the drop-shadow rgba

#### Manual Verification:

- User-location marker is a coral doghouse teardrop pin matching the app style; readable in light + dark
- Radius circle renders as a dashed "leash" in the brand color; dog pins coral with initials
- ~40 varied demo dogs show on `/owners` (breeds/sizes/traits/ages spread across the region) so the list scrolls and every filter has volume

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: Desktop two-pane layout

### Overview

Rebuild `OwnersMapView` so desktop shows a sticky map pane beside a scrollable results column, and
make the dog-detail `Sheet` open from the side on desktop and the bottom on mobile (charges 1, 2, 3).

### Changes Required:

#### 1. Media-query hook

**File**: `src/components/hooks/useMediaQuery.ts` (new)

**Intent**: A small client hook so components can branch on viewport width; enables the responsive
`Sheet` side and any future desktop branches.

**Contract**: `useMediaQuery(query: string): boolean`. Returns `false` on first render, subscribes to
`window.matchMedia(query)` in `useEffect`, updates on change, cleans up on unmount. (CLAUDE.md:
hooks live in `src/components/hooks/`.)

#### 2. Two-pane layout

**File**: `src/components/map/OwnersMapView.tsx`

**Intent**: Replace the single column with a responsive layout — stacked on mobile, two-pane on
`lg:` — keeping `SearchFilters` across the top and feeding the same `filtered` to both panes.

**Contract**: Wrap map + list in a `lg:grid lg:grid-cols-[minmax(0,1fr)_380px]` (or flex) row. Map
pane: `lg:sticky lg:top-0 lg:h-[calc(100svh-<chrome>)]`, mobile keeps `h-[260px]`. List column:
scrollable (`lg:overflow-y-auto`), same `DogCard` list. No change to `filtered`/state.

#### 3. Responsive dog-detail sheet

**File**: `src/components/map/BottomSheet.tsx` + its use in `OwnersMapView.tsx:86`

**Intent**: Open the detail panel from the right on desktop and the bottom on mobile, instead of
always bottom.

**Contract**: Compute `const isDesktop = useMediaQuery("(min-width: 1024px)")` and pass
`side={isDesktop ? "right" : "bottom"}` into `SheetContent`. Keep the existing rounded/padding
classes conditional on side if needed. No API change to `BottomSheet`'s props beyond reading the hook.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Desktop (`≥1024px`): map on the left stays in view while the results column scrolls; map is not grey
- Applying a filter (size / 2 traits / distance) changes the visible list without scrolling
- Selecting a dog opens a right-side panel on desktop, a bottom sheet on mobile
- Mobile (`<1024px`) layout is visually unchanged from before (stacked map + list + bottom sheet)

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 3.

---

## Phase 3: State matrix, visual gate, and guard rule

### Overview

Prove the view across the 7-state matrix, capture the visual gate (desktop + mobile), and leave a
rule so the next agent keeps the tokens, components, and responsive layout.

### Changes Required:

#### 1. State matrix + visual gate

**File**: `context/changes/ui-owners-desktop-layout/` (screenshots) and the running `/owners` view

**Intent**: Show every applicable state of the view at desktop and one mobile width as review
evidence.

**Contract**: Capture `screenshot-desktop.png` and `screenshot-mobile.png` of `/owners` (via
`npm run build` + `npm run preview`, logged in with a city set). Exercise: default, hover on a
DogCard/button, keyboard focus-visible on filters and cards, the empty state (no dogs in range →
list + map with no pins), and loading (initial map tiles). `disabled`/`error` are N/A (the filter
form has no disabled/submit-error states) — record the reason.

#### 2. Guard rule

**File**: `CLAUDE.md`

**Intent**: Tell the next agent where tokens/components live and that `/owners` is responsive, so the
contract is not undone.

**Contract**: Add a short UI block (outside the `<!-- BEGIN @przeprogramowani/10x-cli -->` … `END`
markers): tokens in `src/styles/global.css`, shared components in `src/components/ui/`, "no color
literals in map/views — use tokens (incl. `--user-pin`)", and "`/owners` is two-pane on `lg:`; map
pane needs a definite height (Leaflet has no `invalidateSize`)".

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`
- Both screenshots exist in the change folder

#### Manual Verification:

- All 7 states shown or marked N/A with a reason (disabled/error N/A)
- Focus ring visible on every filter control and DogCard via keyboard (`--ring` token)
- Empty state shows a real message, not a blank frame
- CLAUDE.md UI block reads correctly and is outside the CLI-managed markers

**Implementation Note**: After automated verification passes, pause for manual confirmation; this closes the change.

---

## Testing Strategy

### Unit Tests:

- None new — `filterDogs` is already covered by `tests/unit/dogFilter.test.ts`; this change is
  presentational and adds no pure logic beyond the `useMediaQuery` hook.

### Manual Testing Steps:

1. `npm run build` && `npm run preview`; sign in with a profile that has a city set; open `/owners`.
2. At desktop width, confirm the two-pane layout, sticky map, and scrollable list.
3. Apply each filter and confirm the list changes in view without scrolling.
4. Click a dog → right panel (desktop); narrow to mobile → bottom sheet.
5. Resize to mobile and confirm the layout matches the pre-change stacked view.
6. Tab through controls and confirm visible focus; check empty state by filtering to 0 dogs.

## Performance Considerations

No new data or network work. `useMediaQuery` adds one `matchMedia` listener. Sticky positioning and
a `lg:` grid are CSS-only.

## References

- Related research: `context/changes/ui-owners-desktop-layout/research.md`
- Prior build of this view: `context/changes/ui-owners-map/change.md`
- Token precedent (sibling view): `context/changes/meetings-ui-tokens/`
- Blocked gates this unblocks: `context/changes/dog-search-filters/plan.md` (4.3-4.6)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Marker tokens

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — c974fd8
- [x] 1.2 Build passes: `npm run build` — c974fd8
- [x] 1.3 Hardcoded-value scan shows no palette/hex literals in DogMap.tsx except the drop-shadow rgba — c974fd8

#### Manual

- [x] 1.4 User-location marker is a coral doghouse pin matching app style; readable light + dark — c974fd8
- [x] 1.5 Radius circle renders as a dashed "leash" in brand color; dog pins coral with initials — c974fd8
- [x] 1.6 ~40 varied demo dogs show on /owners (breed/size/traits/age spread); list scrolls, filters have volume — c974fd8

### Phase 2: Desktop two-pane layout

#### Automated

- [x] 2.1 Linting passes: `npm run lint`
- [x] 2.2 Build passes: `npm run build`

#### Manual

- [x] 2.3 Desktop: map stays in view while results column scrolls; map not grey
- [x] 2.4 Applying a filter changes the visible list without scrolling
- [x] 2.5 Dog detail opens right-side on desktop, bottom sheet on mobile
- [x] 2.6 Mobile layout unchanged from before

### Phase 3: State matrix, visual gate, and guard rule

#### Automated

- [ ] 3.1 Linting passes: `npm run lint`
- [ ] 3.2 Build passes: `npm run build`
- [ ] 3.3 Both screenshots exist in the change folder

#### Manual

- [ ] 3.4 All 7 states shown or marked N/A with a reason
- [ ] 3.5 Focus ring visible on every filter control and DogCard via keyboard
- [ ] 3.6 Empty state shows a real message, not a blank frame
- [ ] 3.7 CLAUDE.md UI block correct and outside the CLI-managed markers
