# Dog form desktop layout — Implementation Plan

## Overview

Make the add/edit dog form (`/dogs/new`, `/dogs/[id]`) adapt on desktop: widen the card and lay the
fields out in two columns on `lg:` instead of a phone-width single column. Mobile unchanged.

## What We're NOT Doing

- No i18n (DogForm already uses `t()`), no data/schema/validation change, no marker work.

## Phase 1: Widen card + two-column form

### Changes Required:

**1. Page cards** — `src/pages/dogs/new.astro`, `src/pages/dogs/[id].astro`

**Intent**: Stop constraining the form to phone width on desktop.

**Contract**: card `max-w-sm` → `max-w-sm lg:max-w-3xl` in both pages (keep centered, headings and the
edit page's Delete link unchanged).

**2. Two-column form** — `src/components/dogs/DogForm.tsx`

**Intent**: On desktop, fields in two columns beside each other.

**Contract**: Wrap fields in `lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start` — left: name, breed,
size; right: traits, birthdate, photo. `ServerError` + `SubmitButton` stay full-width below. Mobile
keeps the single `space-y-4` column.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Desktop (≥1024px): add + edit dog forms show two columns in a wider card; not a phone column
- Mobile (<1024px): single column, unchanged
- Submit + validation + photo upload still work; edit page's Delete link intact

## References

- Sibling: `context/changes/ui-profile-desktop/` (same pattern)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Widen card + two-column form

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — 0207a55
- [x] 1.2 Build passes: `npm run build` — 0207a55

#### Manual

- [ ] 1.3 Desktop: add + edit dog forms are two columns in a wider card
- [ ] 1.4 Mobile: single column unchanged; submit/validation/photo/delete all work
