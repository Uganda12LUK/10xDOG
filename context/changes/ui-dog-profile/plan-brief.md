# ui-dog-profile (U-06) — Plan Brief

> Full plan: `context/changes/ui-dog-profile/plan.md`
> Research: `context/changes/ui-dog-profile/research.md`

## What & Why

Redesign the public owner/dog profile at `src/pages/owners/[id].astro` from a small centered
card into a hero-led profile that reuses the repo's design-system components. The view already
uses tokens correctly, so the problem is structural drift — it reinvents buttons and lists
instead of importing the primitives, and it doesn't deliver the hero/sticky-footer the slice
calls for.

## Starting Point

Today the view is a `max-w-sm` centered card: dogs in a raw `<ul><li>`, breed as plain text,
the no-dogs case silently hidden, and the CTA / disabled pending state / back link all raw
`<a>`/`<button>`+classes (the disabled one has no focus ring). Auth is already handled —
`/owners/<id>` is protected by the middleware.

## Desired End State

A full-bleed hero photo (first dog's photo, with fallbacks), breed/size/traits as `Badge`
chips in a tags card, and a sticky footer with a primary "Zaproponuj spotkanie" CTA (disabled
when pending) plus a secondary "Wróć" button. Owners with no dogs get a real empty state. Every
UI state is visible on a dev-only kitchen-sink page, screenshotted desktop + mobile, and a
CLAUDE.md rule keeps the next agent on the contract.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope of brief | 4 data-backed charges only | "O mnie"/"Preferencje" + heart have no schema backing | Research |
| Hero image | First dog's photo → avatar → 🐾 | Matches the "dog profile" intent; most visual | Plan |
| Footer CTAs | Primary "Zaproponuj spotkanie" + "Wróć" | Honors the two-CTA footer using only backed actions (favorite deferred, breeding future) | Plan |
| Visual gate | Static kitchen-sink page + manual shots | Local Supabase/dev-server blocked; backend-free surface | Plan |
| Button/badge reuse | `buttonVariants` / `badgeVariants` on static markup | Astro-idiomatic reuse of the same cva, no React hydration, no second button | Plan |
| Component extraction | New `OwnerProfile.astro` from props | One source of markup for the page and the kitchen sink | Plan |

## Scope

**In scope:**
- Extract `OwnerProfile.astro`; hero + tags card (Badge) + sticky footer (Button contract).
- Real empty state for no-dogs; 7-state matrix on a kitchen-sink page; manual screenshots.
- CLAUDE.md UI rule + hardcoded-value scan check.

**Out of scope:**
- "O mnie" / "Preferencje spacerów" sections and the heart/favorite (net-new data — deferred).
- Breeding CTA (future slice). CI screenshot gate (runtime blocked). Owners list/map, services, APIs.

## Architecture / Approach

Page keeps its server frontmatter (fetch, `isOwnProfile`, not-found) and renders a new pure
presentational `OwnerProfile.astro` for the "other owner" branch. The kitchen-sink page renders
the same component with fixtures across all states — giving the visual gate a backend-free
surface while keeping one source of truth for the markup.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Restructure view | `OwnerProfile.astro`: hero, Badge tags, sticky Button footer | Preserving the 3 existing branches + the meeting link |
| 2. States + gate | Empty state, kitchen-sink page, desktop/mobile screenshots | `loading` is N/A (SSR) — document, don't fake it |
| 3. Make it stick | CLAUDE.md UI rule + value scan at 0 hits | Rule drifts if written inside the 10x-cli markers |

**Prerequisites:** U-01 design tokens (done); research complete.
**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- Hero uses `dogs[0]` — a multi-dog owner shows one dog in the hero (others in the list); accepted.
- Sticky footer behavior on short mobile viewports needs an eyeball check (the mobile screenshot).
- Product may later reopen the deferred sections/heart as their own slice — noted in research.

## Success Criteria (Summary)

- Visiting another owner's profile shows a hero, badge tags, and a sticky primary+back footer; no-dogs shows a real empty state.
- Every applicable UI state is visible on the kitchen-sink page and captured at desktop + mobile.
- `npm run lint` and `npm run build` pass; the view scans clean (0 literal-colour hits); the CLAUDE.md rule is in place.
