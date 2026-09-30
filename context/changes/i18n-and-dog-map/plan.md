# i18n + Dog-first Map — Implementation Plan

> Change: `context/changes/i18n-and-dog-map/`
> Design: `context/changes/i18n-and-dog-map/design.md` (approved)

## Overview

Introduce a PL/EN i18n subsystem (cookie-scoped locale + dictionaries + `t()` helper), apply it to navigation, tabs, form labels and buttons (including auth), restructure the map to be dog-first (one pin per dog, owner as secondary info), replace the breed filter chips with a native `<select>`, and verify the dashboard width aligns with the Topbar.

## Current State Analysis

- `src/middleware.ts` resolves `context.locals.user` and gates `PROTECTED_ROUTES`; no locale handling. `src/env.d.ts` declares only `App.Locals.user`.
- UI strings are hardcoded and mixed PL/EN (dashboard PL, auth EN, meetings tabs PL).
- Map: `src/pages/owners/index.astro` fetches `listOwners(...)` → `OwnerWithDogs[]`; `OwnersMapView.tsx` renders `FilterChips` (chips, already above the map) + `DogMap` (one marker per **owner**, offset keyed by `owner.profile.id`) + owner cards + `BottomSheet`. `DogMap.tsx` exports `CITY_CENTERS` (now includes Rzeszów).
- Breed filter: `FilterChips.tsx` — chip row with disabled "Wkrótce" placeholders (Wiek/Płeć/Charakter).
- Dashboard: `dashboard.astro` + `Topbar.astro` both set to `max-w-4xl` in change `67a2786`.

## Desired End State

A user toggles PL/EN from the nav; navigation, tabs, form field labels and buttons switch language (auth included). The map shows one pin per dog with the owner named under each dog; the breed filter is a dropdown; the dashboard lines up with the top panel on desktop.

## What We're NOT Doing

- No URL-prefixed locales, no Accept-Language negotiation (cookie only).
- No translation of dynamic/user data or every error/empty-state string in v1.
- No real dog geolocation (pins stay deterministic offsets from map center).
- No map clustering; no renaming of routes.

## Critical Implementation Details

`t(locale, key)` returns the key itself when a key is missing (never throws) so a missing translation degrades to a visible key, not a crash. React islands cannot read `Astro.locals` — the mounting `.astro` page must pass `locale` as a prop to each island that renders translated strings.

---

## Phase 1: i18n foundation

### Overview

The locale plumbing: dictionaries, `t()` helper, middleware resolution, `App.Locals` typing, and a language switcher. No user-visible strings change yet.

### Changes Required:

#### 1. i18n library

**File**: `src/lib/i18n/index.ts` (new), `src/lib/i18n/pl.ts` (new), `src/lib/i18n/en.ts` (new)

**Intent**: Central locale definitions + a lookup helper usable from both `.astro` and React.

**Contract**:
- `index.ts` exports: `type Locale = "pl" | "en"`, `DEFAULT_LOCALE: Locale = "pl"`, `LOCALE_COOKIE = "locale"`, `isLocale(v: string | null | undefined): v is Locale`, and `t(locale: Locale, key: string): string`.
- `pl.ts` / `en.ts` export a flat `Record<string, string>` dictionary keyed by dot-namespaces (`nav.*`, `common.*`, …). `t()` looks up `dict[key]`, falling back to the `key` string if absent.

#### 2. Locale resolution in middleware

**File**: `src/middleware.ts`

**Intent**: Set `context.locals.locale` on every request; allow switching via `?lang=`.

**Contract**: Near the top of `onRequest`: read `context.url.searchParams.get("lang")`; if it `isLocale`, set the `locale` cookie (path `/`, ~1 year, not httpOnly) and redirect to the same pathname with `lang` stripped. Otherwise read the `locale` cookie via `context.cookies.get(LOCALE_COOKIE)`, and set `context.locals.locale = isLocale(cookieVal) ? cookieVal : DEFAULT_LOCALE`. Must run before the existing redirects so they carry through.

#### 3. Locals typing

**File**: `src/env.d.ts`

**Intent**: Type the new local.

**Contract**: Add `locale: import("@/lib/i18n").Locale` to `App.Locals`.

#### 4. Language switcher

**File**: `src/components/LangSwitcher.astro` (new); edit `src/components/Topbar.astro`, `src/components/BottomNav.astro`

**Intent**: Two links (PL / EN) that set the language while preserving the current path.

**Contract**: `LangSwitcher.astro` renders `<a href="{pathname}?lang=pl">PL</a>` / `?lang=en">EN</a>`, active locale visually marked, using `Astro.locals.locale` and `Astro.url.pathname`. Mount it in the Topbar (desktop bar) and BottomNav (or the mobile header area).

### Success Criteria:

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes
- `src/lib/i18n/index.ts`, `pl.ts`, `en.ts` exist

#### Manual Verification:
- Visiting `?lang=en` sets the cookie and the URL redirects without `lang`; reload keeps the choice
- PL/EN switcher is visible on desktop (Topbar) and mobile (BottomNav)

---

## Phase 2: Apply i18n to nav, tabs, forms, buttons

### Overview

Replace hardcoded nav/tab/form-label/button strings with `t()` lookups across the app, including auth pages. Populate the dictionaries.

### Changes Required:

#### 1. Dictionary keys

**File**: `src/lib/i18n/pl.ts`, `src/lib/i18n/en.ts`

**Intent**: Add every key the views below reference, PL and EN in parallel.

**Contract**: Namespaces: `nav.*` (start, map, meetings, events, profile, dogs, signout), `meetings.tabs.*` (upcoming, proposals, invitations, history) + `meetings.*` buttons (accept, decline), `form.dog.*` / `form.profile.*` / `auth.*` (field labels + submit buttons), `common.*` (save, cancel, send, back). Keys must exist in both files.

#### 2. Wire views to `t()`

**File**: `src/components/BottomNav.astro`, `src/components/Topbar.astro`, `src/pages/dashboard.astro`, `src/pages/meetings/index.astro` + `src/components/meetings/MeetingsView.tsx`, `src/pages/owners/index.astro`, `src/pages/dogs/{index,new,[id]}.astro` + `src/components/dogs/DogForm.tsx`, `src/pages/profile.astro` + `src/components/profile/ProfileForm.tsx`, `src/pages/auth/{signin,signup,confirm-email}.astro` + `src/components/auth/*` form components

**Intent**: Render nav labels, tab labels, form field labels and primary buttons through `t(locale, key)`.

**Contract**: `.astro` files read `const { locale } = Astro.locals` and call `t(locale, "…")`. React islands receive `locale` as a new prop from their mounting `.astro` and call `t(locale, "…")` internally. Only nav/tabs/field-labels/buttons in scope; leave dynamic data and error/empty-state strings as-is unless trivially in scope.

### Success Criteria:

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- Toggling PL↔EN switches: bottom nav + topbar labels, meetings tab labels + accept/decline buttons, dog form + profile form field labels, auth form labels + submit buttons
- No untranslated raw keys appear (e.g. `nav.map`) in either language

---

## Phase 3: Dog-first map

### Overview

Restructure the map so each dog is a pin, the list shows dogs, and the owner is secondary info.

### Changes Required:

#### 1. DogWithOwner type + service

**File**: `src/types.ts`, `src/lib/services/profile.ts` (or new `src/lib/services/map.ts`)

**Intent**: Provide a flat dog list carrying owner identity for the map.

**Contract**: `DogWithOwner = Dog & { ownerId: string; ownerName: string; ownerCity: string | null }`. Add `listDogsForMap(client, userId, city, district?)` that reuses the existing owner query and flat-maps each owner's dogs into `DogWithOwner[]` (excluding the current user).

#### 2. DogMap: pin per dog

**File**: `src/components/map/DogMap.tsx`

**Intent**: One marker per dog, positioned by a deterministic offset keyed on `dog.id`.

**Contract**: Change props to accept `dogs: DogWithOwner[]`; render one `Marker` per dog with offset from `deterministicOffset(dog.id)`; `onDogSelect(dog)` on click. Keep `CITY_CENTERS` export.

#### 3. Map view: dog list + bottom sheet

**File**: `src/components/map/OwnersMapView.tsx`, `src/components/map/BottomSheet.tsx`, `src/pages/owners/index.astro`

**Intent**: List dog cards; bottom sheet shows the dog with its owner and the propose-walk link.

**Contract**: `owners/index.astro` calls `listDogsForMap(...)` and passes `dogs` + `locale`. `OwnersMapView` renders dog cards (photo, name, breed; owner name subline) and a `BottomSheet` showing the dog + "właściciel: {ownerName}" + a link to `/meetings/new?receiver_id={ownerId}`. Breed filter now filters the flat dog list directly.

### Success Criteria:

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- Map shows one pin per dog (an owner with 2 dogs → 2 pins)
- The list under the map shows dog cards with the owner as a subline
- Clicking a pin/card opens a bottom sheet naming the owner with a working "Zaproponuj spacer" link

---

## Phase 4: Breed dropdown

### Overview

Replace the chip filter with a native `<select>`; drop the "Wkrótce" placeholders.

### Changes Required:

#### 1. BreedSelect

**File**: `src/components/map/FilterChips.tsx` → replace with `src/components/map/BreedSelect.tsx` (new; remove the old file), edit `src/components/map/OwnersMapView.tsx`

**Intent**: A dropdown that scales across many breeds.

**Contract**: `BreedSelect` renders a token-styled `<select>` with a first option "Wszystkie rasy" (value `""`) plus one option per breed present on the map; `onChange` maps `""`→`null` and calls `onBreedChange`. Remove the disabled Wiek/Płeć/Charakter placeholders. Label text goes through `t()`.

### Success Criteria:

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- The breed filter is a dropdown; selecting a breed narrows the pins and list; "Wszystkie rasy" resets
- No "Wkrótce" placeholder chips remain

---

## Phase 5: Dashboard width verify/refine

### Overview

Confirm the dashboard lines up with the Topbar on desktop; refine only if a mismatch remains.

### Changes Required:

#### 1. Verify / reconcile widths

**File**: `src/pages/dashboard.astro`, `src/components/Topbar.astro` (only if needed)

**Intent**: Dashboard content and the top panel share the same max width and horizontal alignment on desktop.

**Contract**: Confirm both resolve to `max-w-4xl` centered with matching horizontal padding. If they still diverge (breakpoint or padding mismatch), align the container/padding so left/right edges match at `md`+.

### Success Criteria:

#### Automated Verification:
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:
- On a desktop-width window, the dashboard content's left/right edges line up with the Topbar's

---

## Testing Strategy

Manual, via `npm run build && npx wrangler dev` (port 8787) with the Rzeszów test data loaded. Per phase: run lint+build, then click through the manual checks. i18n: toggle PL/EN on each touched view. Map: verify pin-per-dog and owner subline. Filter: verify the dropdown. Dashboard: check alignment at desktop width.

## References

- Design: `context/changes/i18n-and-dog-map/design.md`
- Middleware: `src/middleware.ts`; Locals typing: `src/env.d.ts`
- Map: `src/components/map/{DogMap,OwnersMapView,FilterChips,BottomSheet}.tsx`, `src/pages/owners/index.astro`
- Nav: `src/components/{Topbar,BottomNav}.astro`, `src/layouts/Layout.astro`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: i18n foundation

#### Automated
- [x] 1.1 `npm run lint` passes — 8013020
- [x] 1.2 `npm run build` passes — 8013020
- [x] 1.3 `src/lib/i18n/{index,pl,en}.ts` exist — 8013020

#### Manual
- [ ] 1.4 `?lang=en` sets cookie + redirects without `lang`; choice persists on reload
- [ ] 1.5 PL/EN switcher visible on desktop (Topbar) and mobile (BottomNav)

### Phase 2: Apply i18n to nav, tabs, forms, buttons

#### Automated
- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npm run build` passes

#### Manual
- [ ] 2.3 Toggling PL↔EN switches nav + topbar labels
- [ ] 2.4 Meetings tab labels + accept/decline buttons switch language
- [ ] 2.5 Dog form + profile form field labels switch language
- [ ] 2.6 Auth form labels + submit buttons switch language
- [ ] 2.7 No untranslated raw keys visible in either language

### Phase 3: Dog-first map

#### Automated
- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run build` passes

#### Manual
- [ ] 3.3 One pin per dog (owner with 2 dogs → 2 pins)
- [ ] 3.4 List shows dog cards with owner as subline
- [ ] 3.5 Bottom sheet names the owner + working "Zaproponuj spacer" link

### Phase 4: Breed dropdown

#### Automated
- [ ] 4.1 `npm run lint` passes
- [ ] 4.2 `npm run build` passes

#### Manual
- [ ] 4.3 Breed filter is a dropdown; selecting narrows pins + list; reset works
- [ ] 4.4 No "Wkrótce" placeholder chips remain

### Phase 5: Dashboard width verify/refine

#### Automated
- [ ] 5.1 `npm run lint` passes
- [ ] 5.2 `npm run build` passes

#### Manual
- [ ] 5.3 Dashboard content edges line up with the Topbar at desktop width
