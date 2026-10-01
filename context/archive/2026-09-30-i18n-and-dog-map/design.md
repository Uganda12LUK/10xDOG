# Design: i18n + dog-first map + breed dropdown + dashboard width

> Brainstormed design, approved in chat 2026-09-30. Input for `/10x-plan`.
> One change, four parts. i18n is the architectural core; the rest are bounded UI changes.

## Context

Feedback after clicking through the live app:
1. The map lists **owners**, but the product concept is dog-first — users should see **dogs** pinned to approximate locations, with the owner attached as secondary info.
2. Breed filtering uses a scrolling chip row; it should be a **dropdown/select** (scales better across many breeds).
3. Dashboard width should **line up with the top panel** (Topbar). Change A (`67a2786`) already set both to `max-w-4xl` — verify after deploy; refine only if still misaligned.
4. No language choice. Add a **PL/EN switcher** and translate navigation, tabs, form field labels, and main buttons. The app currently mixes Polish and English strings; i18n standardizes this.

Intended outcome: a dog-centric map, a cleaner breed filter, aligned desktop layout, and a bilingual UI the user can toggle.

## Part 1 — i18n subsystem (architectural)

**Approach (chosen): cookie-scoped locale + dictionary + `t()` helper.** Rejected: Astro i18n URL routing (`/en/…`) — would restructure routing/URLs for no benefit here; react-i18next — heavy and does not cover `.astro` SSR files.

- **`src/lib/i18n/`**
  - `index.ts` — `export type Locale = "pl" | "en"`, `DEFAULT_LOCALE = "pl"`, `LOCALE_COOKIE = "locale"`, `t(locale: Locale, key: string): string` (flat dot-keyed lookup, falls back to the key if missing), `isLocale(v): v is Locale`.
  - `pl.ts`, `en.ts` — flat dictionaries keyed by namespace: `nav.*`, `meetings.tabs.*`, `form.dog.*`, `form.profile.*`, `auth.*`, `common.*` (buttons: save/cancel/send/accept/decline), `map.*`.
- **Locale resolution — `src/middleware.ts`**: if `?lang=pl|en` present → set `locale` cookie (1-year, httpOnly false so client links work), then redirect to the same path without `lang`. Otherwise read the cookie (fallback `DEFAULT_LOCALE`) and set `context.locals.locale`.
- **Types — `src/env.d.ts`**: add `locale: import("@/lib/i18n").Locale` to `App.Locals`.
- **Switcher**: two links `PL` / `EN` pointing to `?lang=pl` / `?lang=en` (preserving current path), placed in `Topbar.astro` (desktop) and `BottomNav.astro` or the mobile header. Active locale styled.
- **Usage**:
  - `.astro`: `const { locale } = Astro.locals;` then `t(locale, "nav.map")`.
  - React islands: the mounting `.astro` passes `locale` as a prop; island calls the same `t(locale, key)`.
- **v1 string scope**: navigation, tabs, form field labels, main buttons (per decision). Error messages / empty states / dynamic data are out of v1 (can follow later); pick a sensible subset where cheap.

## Part 2 — Dog-first map

- **Data shape**: introduce `DogWithOwner` (a `Dog` plus `ownerId` + `ownerName`, and owner `city`). A service function flattens owners→dogs: `listDogsForMap(client, userId, city[, district])` returning `DogWithOwner[]` (reuse the existing `listOwners` query, then flat-map dogs). Lives in `src/lib/services/` (profile.ts or a new map service).
- **`DogMap.tsx`**: one marker **per dog**, deterministic offset keyed by `dog.id` (owner with 3 dogs → 3 pins). Marker icon may show the dog (initial or 🐾). Click → select that dog.
- **`OwnersMapView.tsx`** (rename intent → `DogMapView` or keep name, decide in plan): list renders **dog cards** (dog photo, name, breed; owner name as subline) instead of owner cards. `BottomSheet` shows the dog + "właściciel: X" + "Zaproponuj spacer" linking to `/meetings/new?receiver_id=<ownerId>`.
- Breed filter now filters the flat dog list directly (simpler than the current `some()` over owner.dogs).

## Part 3 — Breed dropdown

- Replace `FilterChips` with `BreedSelect` — a native `<select>` (styled with tokens) whose options are `Wszystkie rasy` + breeds present on the map. Emits the same `onBreedChange`. Drop the disabled "Wkrótce" chips (or keep as disabled `<optgroup>` — decide in plan; lean toward dropping for simplicity).

## Part 4 — Dashboard width

- Verify Change A already aligned dashboard (`md:max-w-4xl`) with Topbar (`max-w-4xl mx-auto`). If a mismatch remains after deploy, reconcile container widths/padding. Small; likely a no-op or a one-line tweak.

## What we're NOT doing

- No URL-prefixed locales, no server-side Accept-Language negotiation (cookie only).
- No translation of dynamic/user data or every error string in v1.
- No real dog geolocation (pins stay deterministic offsets from map center; there are no lat/lng columns).
- No map clustering.

## Phasing (for /10x-plan)

1. i18n foundation (lib + middleware + env.d.ts + switcher) — no visible string changes yet.
2. Apply i18n to nav/tabs/forms/buttons across views.
3. Dog-first map (data shape + DogMap + list + bottom sheet).
4. Breed dropdown.
5. Dashboard width verify/refine.

## Verification

- `npm run lint` + `npm run build` green per phase.
- Manual (via `wrangler dev`, Rzeszów test data): toggle PL/EN and confirm nav/tabs/form labels switch; map shows one pin per dog with owner as subline; breed `<select>` filters dogs; dashboard aligns with Topbar on desktop.
