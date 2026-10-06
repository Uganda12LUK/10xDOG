# Your profile: desktop layout + shared home marker — Implementation Plan

## Overview

Make `/profile` adapt on desktop (two-column: text fields beside the location map, instead of a
phone-width centered card) and swap the location picker's `📍` emoji for the shared buda (doghouse)
home marker used on `/map`. Extract that marker to one module so `/map` and `/profile` share it.

## What We're NOT Doing

- No i18n (profile already English via `t()`), no data/schema/save-flow change.
- No change to the meeting-form dog-nose pin or dog pins.

## Phase 1: Shared home marker

### Changes Required:

**1. Shared marker module** — `src/components/map/markerIcons.ts` (new)

**Intent**: One source for the brand home (buda) marker so views don't duplicate the SVG.

**Contract**: Export `userHomeIcon` — the `L.divIcon` currently inline in `DogMap.tsx` (coral teardrop
+ white doghouse glyph, token colors, anchor at nose tip). Pure module (`leaflet` only).

**2. DogMap uses it** — `src/components/map/DogMap.tsx`

**Intent**: Remove the inline `userIcon`, import from the shared module (no behavior change).

**Contract**: Delete the inline `userIcon` const; `import { userHomeIcon }`; use it for the user Marker.

**3. Profile picker uses it** — `src/components/profile/ProfileForm.tsx`

**Intent**: Replace the `📍` emoji marker with the shared buda.

**Contract**: Delete the `pinIcon` emoji const; `import { userHomeIcon }`; pass it to the picker Marker.
Keep `import L` (still used for the `useRef<L.Marker>` type).

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`
- No `📍` / emoji divIcon remains in ProfileForm; `userIcon` no longer inline in DogMap

#### Manual Verification:

- `/profile` location picker shows the buda marker (same as the home pin on `/map`)
- `/map` home marker still renders correctly (regression check)

## Phase 2: Desktop layout

### Changes Required:

**1. Page card width** — `src/pages/profile.astro`

**Intent**: Stop constraining the profile to phone width on desktop.

**Contract**: The card `max-w-sm` → `max-w-sm lg:max-w-3xl` (keep centered); heading stays.

**2. Two-column form** — `src/components/profile/ProfileForm.tsx`

**Intent**: On desktop, text fields beside the location map instead of one tall column.

**Contract**: Wrap (name, district, city, photo) and (location map) in a `lg:grid lg:grid-cols-2
lg:gap-6 lg:items-start`; onboarding banner / ServerError / saved / submit stay full-width. Map box
`200px` → `lg:h-[320px]`. Mobile keeps the single column.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Desktop (≥1024px): fields beside the map in a wider card; not a narrow phone column
- Mobile (<1024px): single column, unchanged
- Map still draggable / tap-to-move; save flow works

## References

- Siblings: `context/changes/ui-owners-desktop-layout/`, `context/changes/ui-meeting-form-desktop/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Shared home marker

#### Automated

- [x] 1.1 Linting passes: `npm run lint`
- [x] 1.2 Build passes: `npm run build`
- [x] 1.3 No emoji divIcon in ProfileForm; userIcon no longer inline in DogMap

#### Manual

- [ ] 1.4 /profile picker shows the buda marker (same as /map home pin)
- [ ] 1.5 /map home marker still renders (no regression)

### Phase 2: Desktop layout

#### Automated

- [x] 2.1 Linting passes: `npm run lint`
- [x] 2.2 Build passes: `npm run build`

#### Manual

- [ ] 2.3 Desktop: fields beside the map in a wider card; not a phone column
- [ ] 2.4 Mobile: single column, unchanged; map draggable; save works
