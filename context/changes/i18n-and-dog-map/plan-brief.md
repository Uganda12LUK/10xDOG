# Plan Brief: i18n + Dog-first Map

> Full plan: `context/changes/i18n-and-dog-map/plan.md` · Design: `design.md`

## What & why

Four UX changes from live-app feedback, bundled into one change. The core is a **PL/EN language switcher** (i18n subsystem) applied to navigation, tabs, form labels and buttons. Alongside it: the map becomes **dog-first** (one pin per dog, owner attached), the breed filter becomes a **dropdown**, and the dashboard width is verified against the top panel.

## Starting point

- No locale concept; UI strings hardcoded and mixed PL/EN. `middleware.ts` sets `locals.user` only.
- Map lists **owners** (`OwnerWithDogs`, one pin per owner). Breed filter is a chip row with disabled "Wkrótce" placeholders.
- Dashboard + Topbar already set to `max-w-4xl` (change `67a2786`).

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| i18n mechanism | Cookie locale + dictionaries + `t()` helper | Fits SSR + React islands; no URL/routing changes |
| Locale switch | `?lang=pl\|en` in middleware → cookie + redirect | Simple, works from plain links |
| React islands | Receive `locale` as a prop | Islands can't read `Astro.locals` |
| i18n v1 scope | nav, tabs, form labels, buttons — **incl. auth** | Consistent PL/EN from the first screen |
| Missing key behavior | `t()` returns the key (no throw) | Degrades safely |
| Map granularity | One pin per **dog** (offset by `dog.id`) | Product is dog-first; owner as subline |
| Breed filter | Native `<select>`, **remove** "Wkrótce" chips | Scales across breeds; cleaner |
| Dashboard | Verify alignment; refine only if needed | Likely already fixed by `67a2786` |

## Phases

| # | Phase | Scope | Prereq |
|---|---|---|---|
| 1 | i18n foundation | `src/lib/i18n/*`, middleware, `env.d.ts`, LangSwitcher in Topbar+BottomNav | — |
| 2 | Apply i18n | dictionaries + wire nav/tabs/forms/buttons incl. auth through `t()` | 1 |
| 3 | Dog-first map | `DogWithOwner`, `listDogsForMap`, DogMap pin-per-dog, dog cards, bottom sheet | — |
| 4 | Breed dropdown | `FilterChips`→`BreedSelect`, drop "Wkrótce" | 3 |
| 5 | Dashboard width | verify/reconcile dashboard vs Topbar at desktop | — |

**Estimated effort:** Phase 2 is the widest (touches most views); 1, 3 are medium; 4, 5 small.

## Verification

Per phase: `npm run lint` + `npm run build`, then manual via `wrangler dev` (port 8787) with Rzeszów test data — toggle PL/EN, check pin-per-dog + owner subline, breed dropdown, dashboard alignment.

## Not doing

URL-prefixed locales, Accept-Language negotiation, translating dynamic data / every error string, real dog geolocation, map clustering.

## References

- Design: `context/changes/i18n-and-dog-map/design.md`
- `src/middleware.ts`, `src/env.d.ts`, `src/components/map/*`, `src/components/{Topbar,BottomNav}.astro`
