# Propose-meeting page: desktop layout + dog-nose pin + English — Implementation Plan

## Overview

Bring `/meetings/new` up to the same desktop quality as `/owners`: a wider, two-column layout on
desktop (form fields beside a larger location map), a brand dog-in-profile pin whose snout tip marks
the meeting spot, and English strings in place of the leftover hardcoded Polish. Mobile layout is
preserved. No data/schema/API change.

## Current State Analysis

- `src/pages/meetings/new.astro:29` wraps everything in `mx-auto max-w-sm p-4` — a phone-width column
  even on a wide screen. Hardcoded PL: `:28` Layout title, `:33` "Nie wybrano właściciela", `:34`/`:52`
  "← Wróć…", `:41` "Nie znaleziono właściciela", `:54` "Zaproponuj spotkanie: {name}", `:67`
  "Ładowanie formularza…".
- `src/components/meetings/MeetingForm.tsx` is a single `flex-col gap-6` form: type radios, dog chips,
  datetime, a 220px location map (`:133`) with a `📍` emoji `divIcon` (`:17-22`), submit. All labels
  already use `t(locale, …)`. The map is `MapContainer` `height:100%/width:100%` filling a fixed-height
  box (like /owners, no `invalidateSize`).
- i18n: flat dot-keys in `src/lib/i18n/{en,pl}.ts`, parity required; `t(locale, key)` is a plain lookup
  with no interpolation (compose names in the template).

### Key Discoveries:

- Map fills its parent and reads size at mount (`client:only`); a desktop map pane needs a definite
  height (reuse the /owners lesson).
- `divIcon` HTML resolves `var(--color-*)` (proven in /owners DogMap) — the new pin is token-colored.
- `t()` has no params → render `{t(locale,"meetingNew.proposeWith")} {name}`.

## What We're NOT Doing

- No full 5.3 i18n pass — only `/meetings/new` strings. Stray PL in other views (OwnersMapView
  "Zaproponuj spacer", BottomSheet "właściciel:") stays for the i18n pass.
- No data/schema/API change; the invitation POST and location fields are untouched.
- No change to the meeting-type / breeding logic.

## Implementation Approach

Three phases: (1) English strings, (2) desktop layout, (3) dog-nose pin + visual gate + the shared
CLAUDE.md guard rule (which also closes the deferred `ui-owners-desktop-layout` Phase 3).

## Phase 1: English strings (i18n)

### Changes Required:

**1. i18n keys** — `src/lib/i18n/en.ts` + `src/lib/i18n/pl.ts`

**Intent**: Add the propose-meeting-page strings as keys so the page renders in the served locale.

**Contract**: New `meetingNew.*` keys in both files (parity): `title`, `noReceiver`, `backToList`,
`notFound`, `backToProfile`, `proposeWith`, `loading`. EN values from the current English app voice;
PL values from the existing Polish literals.

**2. Page** — `src/pages/meetings/new.astro`

**Intent**: Replace hardcoded Polish with `t(locale, …)`.

**Contract**: `Layout title`, both empty-state messages + their "← Back" links, the heading
(`{t(...proposeWith)} {receiverProfile.name}`), and the fallback slot use the new keys. No layout
change in this phase.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`
- No hardcoded Polish remains in `new.astro` (grep finds no PL diacritics in JSX text)

#### Manual Verification:

- `/meetings/new?receiver_id=…` shows English title, heading, and "← Back" links
- The no-receiver and not-found states render in English

## Phase 2: Desktop layout

### Changes Required:

**1. Page container** — `src/pages/meetings/new.astro`

**Intent**: Stop constraining the page to phone width on desktop.

**Contract**: `max-w-sm` → `max-w-md lg:max-w-3xl` (mobile unchanged, wider on desktop).

**2. Form layout** — `src/components/meetings/MeetingForm.tsx`

**Intent**: On desktop, put the form fields beside a larger map instead of one long column.

**Contract**: On `lg:`, arrange sections in a two-column grid (left: type, dog, datetime; right:
location map), submit spanning full width below. Map box `height:220px` → `lg:h-[360px]` with a
definite height so Leaflet renders (no `invalidateSize`). Mobile keeps the single column.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Desktop (≥1024px): fields sit beside a larger map; the form is no longer a narrow phone column
- The location map renders (not grey) and the pin is still draggable / tap-to-move
- Mobile (<1024px) layout is unchanged (single column, 220px map)

## Phase 3: Dog-nose pin, visual gate, guard rule

### Changes Required:

**1. Meeting pin** — `src/components/meetings/MeetingForm.tsx`

**Intent**: Replace the emoji pin with an on-brand dog-in-profile SVG whose snout tip marks the spot.

**Contract**: `pinIcon` `divIcon` → inline SVG (brand `--color-primary` fill, white details) of a dog
head in profile with a long snout; `iconAnchor` at the nose tip so the pin points at its coordinate.
Sized ~`[44,44]`. Keep drag + tap-to-move behavior.

**2. Guard rule** — `CLAUDE.md`

**Intent**: One UI rule covering both desktop map views so the conventions stick.

**Contract**: Short UI block (outside the `@przeprogramowani/10x-cli` markers): tokens in
`global.css`, components in `src/components/ui/`, "no color literals in map markers — use tokens",
"map panes need a definite height (Leaflet has no invalidateSize)", "desktop views use `lg:` layout,
not phone-width containers". Closes the deferred `ui-owners-desktop-layout` guard-rule step.

**3. Visual gate** — screenshots

**Intent**: Capture the result and close both changes' visual gates.

**Contract**: `screenshot-desktop.png` + `screenshot-mobile.png` of `/meetings/new` in this change
folder; also capture the deferred `/owners` desktop + mobile screenshots into the sibling change folder.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`
- Screenshots exist in the change folder

#### Manual Verification:

- The meeting pin is a brand dog-in-profile marker whose nose points at the spot; drag/tap still works
- Pin readable in light + dark
- CLAUDE.md UI block reads correctly and is outside the CLI-managed markers

## References

- Sibling change: `context/changes/ui-owners-desktop-layout/` (same patterns, deferred Phase 3 closed here)
- i18n dictionaries: `src/lib/i18n/en.ts`, `src/lib/i18n/pl.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: English strings (i18n)

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — 8ab8a4d
- [x] 1.2 Build passes: `npm run build` — 8ab8a4d
- [x] 1.3 No hardcoded Polish remains in new.astro — 8ab8a4d

#### Manual

- [x] 1.4 /meetings/new shows English title, heading, and back links — 8ab8a4d
- [x] 1.5 No-receiver and not-found states render in English — 8ab8a4d

### Phase 2: Desktop layout

#### Automated

- [x] 2.1 Linting passes: `npm run lint` — 8ab8a4d
- [x] 2.2 Build passes: `npm run build` — 8ab8a4d

#### Manual

- [x] 2.3 Desktop: fields beside a larger map; not a narrow phone column — 8ab8a4d
- [x] 2.4 Location map renders (not grey); pin draggable / tap-to-move — 8ab8a4d
- [x] 2.5 Mobile layout unchanged (single column, 220px map) — 8ab8a4d

### Phase 3: Dog-nose pin, visual gate, guard rule

#### Automated

- [x] 3.1 Linting passes: `npm run lint` — 8ab8a4d
- [x] 3.2 Build passes: `npm run build` — 8ab8a4d
- [ ] 3.3 Screenshots exist in the change folder

#### Manual

- [x] 3.4 Meeting pin is a brand dog-in-profile marker; nose points at the spot; drag/tap works — 8ab8a4d
- [x] 3.5 Pin readable in light + dark — 8ab8a4d
- [x] 3.6 CLAUDE.md UI block correct and outside the CLI-managed markers — 8ab8a4d
