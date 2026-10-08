---
date: 2026-10-05T16:30:36+02:00
researcher: lmajers
git_commit: e79f1fcf8c62e84735bd7f0841392f7a88d31d58
branch: main
repository: Lekcja_1_DOGFB
topic: "ui-dog-profile (U-06): UI audit of owners/[id].astro against the design-system contract"
tags: [research, codebase, ui, owners, design-system, 10x-ui]
status: complete
last_updated: 2026-10-05
last_updated_by: lmajers
---

# Research: ui-dog-profile (U-06) — audit of `owners/[id].astro`

**Date**: 2026-10-05T16:30:36+02:00
**Researcher**: lmajers
**Git Commit**: e79f1fcf8c62e84735bd7f0841392f7a88d31d58
**Branch**: main
**Repository**: Lekcja_1_DOGFB

## Research Question

Audit the public owner/dog profile view (`src/pages/owners/[id].astro`) against the
Koralowa-smycz design-system contract for the U-06 redesign (hero image, back + heart
overlay, tags card, "O mnie" / "Preferencje spacerów" sections, sticky two-CTA footer).
Ground five candidate charges with file:line evidence and user impact, and decide where
the two new content sections would get their data.

## Summary

This is a **structural / component-reuse** change, not a theming one: the hardcoded-value
scan on `src/pages/owners/[id].astro` returns 0 literal colours / palette classes /
arbitrary sizes — the view already consumes semantic tokens (`bg-card`, `border-border`,
`bg-primary`, `text-muted-foreground`, `text-destructive`). The real charges are: raw
anchors/buttons instead of the repo `Button`, a raw dogs list instead of `Badge`, and a
centered `max-w-sm` card where the brief wants a hero + sticky footer.

Three of the five candidate charges changed after investigation:

- **Charge 5 (auth gating) is NOT a charge.** `/owners` is in `PROTECTED_ROUTES` and the
  middleware matches with `startsWith`, so `/owners/<id>` is gated; a logged-out hit
  redirects to `/auth/signin`. No fix.
- **Charge 2's "badge.tsx is broken" is RETRACTED.** Its `cn` / `radix-ui` imports resolve
  against installed deps (`cn@^0.4.0`, `radix-ui@^1.6.7`) and `badge.tsx` is already used
  by `MeetingsView`. Reuse needs no prerequisite fix — only a note about two import
  conventions coexisting in `src/components/ui/`.
- **Charge 4 splits.** The tags/badges are backed by real data (`dog.breed`, `dog.size`,
  `dog.traits`), so the tags card is in scope. But the schema has **no** about / walk-
  preferences columns, so "O mnie" and "Preferencje spacerów" are net-new data →
  **deferred** (need columns + write-path = a separate feature slice). The brief's "heart"
  overlay is likewise net-new (no favorites table/service) → decorative-only or deferred.

## Detailed Findings

### The view (`src/pages/owners/[id].astro`)

- Server frontmatter fetches only for a logged-in, non-own profile:
  `if (supabase && id && !isOwnProfile)` ([`owners/[id].astro:20`](src/pages/owners/%5Bid%5D.astro)).
- Renders a centered card wrapper: `flex min-h-[80vh] items-center justify-center p-4`
  ([:34](src/pages/owners/%5Bid%5D.astro)) → inner `w-full max-w-sm rounded-2xl border
  border-border bg-card p-8` ([:45](src/pages/owners/%5Bid%5D.astro)).
- Avatar + name + `district, city` header ([:46-64](src/pages/owners/%5Bid%5D.astro)).
- Dogs rendered as a raw `<ul><li>` list, breed as plain text, and the block is hidden
  entirely when empty (`dogs.length > 0 ? ... : null`, [:66-91](src/pages/owners/%5Bid%5D.astro)).
- Error banner ([:93-97](src/pages/owners/%5Bid%5D.astro)).
- Primary action is a raw `<a>` ("Zaproponuj spotkanie") or a raw disabled `<button>`
  ("Invitation sent — awaiting response") depending on `pendingInvitation`
  ([:99-113](src/pages/owners/%5Bid%5D.astro)); "← Back to owners" raw `<a>`
  ([:115-119](src/pages/owners/%5Bid%5D.astro)).

### Design-system contract (already present)

- **Tokens:** `src/styles/global.css` (`@theme` / `:root`, Koralowa-smycz from U-01).
  Scan on the view = 0 hits → tokens already used by role.
- **Components:** `src/components/ui/{button,badge,sheet,tabs}.tsx`, `LibBadge.astro`.
  - `Button` ([`button.tsx:35`](src/components/ui/button.tsx)) — `cva` variants
    (default/destructive/outline/secondary/ghost/link) + sizes, `focus-visible` ring,
    `disabled:` handling, `asChild` for anchors. Imports `cn` from `@/lib/utils`,
    `Slot` from `@radix-ui/react-slot`.
  - `Badge` ([`badge.tsx:26`](src/components/ui/badge.tsx)) — `cva` variants, rounded-full
    chip. Imports `cn` from `"cn"` and `Slot` from `"radix-ui"` (umbrella pkg). Used by
    `MeetingsView` → compiles and runs.

### Auth gating (candidate charge 5 — resolved, no fix)

- `PROTECTED_ROUTES = ["/dashboard", "/profile", "/dogs", "/owners", "/meetings"]`
  ([`src/lib/protected-routes.ts:1`](src/lib/protected-routes.ts)).
- Middleware: `isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))`; if
  protected and `!context.locals.user` → `redirect("/auth/signin")`
  ([`src/middleware.ts:39-45`](src/middleware.ts)). `/owners/<id>` starts with `/owners`,
  so it is gated. The "Owner not found" branch is only reachable by a logged-in user on a
  bad id — correct behavior.

### Data backing for the new sections (decisive for charge 4)

- `Profile` type: `id, name, district, city, avatarPath, avatarUrl, locationLat,
  locationLng, createdAt, updatedAt` ([`src/types.ts`](src/types.ts)) — no about/bio/
  preferences field.
- `Dog` type: `id, ownerId, name, breed, birthdate, size, traits, photoPath, photoUrl,
  createdAt, updatedAt` — `breed`/`size`/`traits` back the tags card; no about/preferences.
- Grep for `about|bio|opis|preference|walk_pref|o_mnie` across `supabase/` → no matches;
  across `src/types.ts` → only `type: "walk"|"breeding"` on `Invitation`. No favorites
  table/service anywhere in `src/` (the `favorite|ulubion|saved` hits are false positives
  on form "saved" state). Therefore "O mnie", "Preferencje spacerów", and the heart/favorite
  action are net-new data, out of scope for a UI-only change.

## Charges

> 3–5 charges for the plan. Each: category, file:line, user impact, fix. Deferred charges
> stay listed with a reason.

### Charge 1 — Missing component: CTAs are raw `<a>`/`<button>` (in scope)
- **Category:** missing shared component.
- **Evidence:** [`owners/[id].astro:99-113`](src/pages/owners/%5Bid%5D.astro) — primary CTA
  is a raw `<a class="... bg-primary ...">`, the pending state a raw disabled `<button>`,
  back-link a raw `<a>` ([:115-119](src/pages/owners/%5Bid%5D.astro)).
- **User impact:** button height/hover/radius drift from the rest of the app; the disabled
  state hand-rolls `cursor-not-allowed`+opacity and has **no** `focus-visible` ring, so a
  keyboard user loses the focus indicator on the main action.
- **Fix:** use `Button` (`ui/button.tsx`) — `asChild` wrapping the `<a>` for the link CTA,
  `variant="secondary"`/`outline` for the back action, the component's `disabled` for the
  pending state. The brief's sticky footer holds **two** CTAs, both `Button`.

### Charge 2 — Missing component: dogs list + breed are raw markup, not `Badge` (in scope)
- **Category:** missing shared component.
- **Evidence:** [`owners/[id].astro:66-91`](src/pages/owners/%5Bid%5D.astro) — `<li>`+classes;
  breed/size/traits not surfaced as chips.
- **User impact:** the dog's defining tags (breed, size, traits) read as plain text or are
  absent; the brief's scannable "tags card" doesn't exist.
- **Fix:** render `dog.breed`, `dog.size`, and each `dog.trait` as `Badge` chips in a tags
  card. **No prerequisite fix** — `badge.tsx` resolves and works (see Detailed Findings).
- **Note (deferred, cosmetic):** `src/components/ui/` mixes two import conventions
  (`button.tsx` uses `@/lib/utils`+`@radix-ui/react-slot`; `badge/tabs/sheet` use
  `cn`+`radix-ui`). Harmonizing is out of scope for this view change.

### Charge 3 — Accidental architecture: centered `max-w-sm` card, not a hero profile (in scope)
- **Category:** accidental architecture.
- **Evidence:** [`owners/[id].astro:34`](src/pages/owners/%5Bid%5D.astro)
  (`min-h-[80vh] items-center justify-center`) + [:45](src/pages/owners/%5Bid%5D.astro)
  (`max-w-sm ... p-8`).
- **User impact:** on mobile the profile is a small boxed card floating mid-screen; the CTA
  sits inside the scroll flow and can scroll out of reach. The brief wants an immersive
  full-bleed hero (`aspect-[4/3]`) with a back overlay and a **sticky** action footer.
- **Fix:** restructure to hero image + scrollable detail sections + sticky footer anchored
  to the viewport bottom. Heart overlay: render decorative only (no favorites backend) or
  omit — see deferred charge below.

### Charge 4 — States: real empty/loading/error for existing content (in scope)
- **Category:** missing states (7-state matrix).
- **Evidence:** empty dogs block is silently hidden ([:66](src/pages/owners/%5Bid%5D.astro));
  no loading state; error is present but ad-hoc ([:93-97](src/pages/owners/%5Bid%5D.astro)).
- **User impact:** an owner with no dogs shows a blank gap; nothing communicates loading.
- **Fix:** add a real empty state for the dogs/tags area, a loading treatment, and route the
  error through the token-driven pattern. Cover default/hover/focus-visible/disabled/error/
  empty/loading in the kitchen sink.

### Charge 5 (candidate) — Auth gating: NOT a charge
- **Resolved:** `/owners/<id>` is gated by `PROTECTED_ROUTES` + `startsWith`
  ([`protected-routes.ts:1`](src/lib/protected-routes.ts),
  [`middleware.ts:39-45`](src/middleware.ts)). Keep as a regression note, no work.

### Deferred — "O mnie" / "Preferencje spacerów" sections + heart/favorite
- **Reason:** net-new data with no schema backing (see Detailed Findings). Implementing them
  means new `profiles`/`dogs` columns + write-path UI in the profile/dog edit forms — a
  feature slice, not a UI-only restyle. Defer to its own change; this change may leave
  labeled placeholders only if desired, but not functional sections.

## Code References

- `src/pages/owners/[id].astro:20` - guarded fetch (logged-in, non-own only)
- `src/pages/owners/[id].astro:34,45` - centered `max-w-sm` wrapper (charge 3)
- `src/pages/owners/[id].astro:66-91` - raw dogs list / breed text (charge 2)
- `src/pages/owners/[id].astro:99-113` - raw CTA + disabled pending state (charge 1)
- `src/components/ui/button.tsx:35` - `Button` to reuse
- `src/components/ui/badge.tsx:26` - `Badge` to reuse (resolves; used by MeetingsView)
- `src/lib/protected-routes.ts:1` - `/owners` protected prefix
- `src/middleware.ts:39-45` - `startsWith` gating + redirect
- `src/types.ts` - `Profile` / `Dog` shapes (no about/preferences fields)

## Architecture Insights

- The view predates the design-system reuse pattern: it inlines token classes correctly but
  never imports the repo primitives (`Button`, `Badge`). That is the drift U-06 fixes.
- Tailwind contract: values in `:root`/`.dark`, published via `@theme`; the view already
  reads them by role, so a dark-mode pass (if the app has one) needs no component-class edits
  here.

## Historical Context (from prior changes)

- `context/foundation/lessons.md` - FORWARD-annotate any UI/route/service added for a later
  slice so review/archival can tell intent from scope creep. Applies if this change touches
  the dog/profile edit forms (it should not — those are deferred).
- `context/changes/ui-owner-detail/change.md` - a generic "Audit /owners/[id]" stub from the
  2026-09-26 U-07 batch; marked **superseded** by this change (same view).
- `context/changes/dog-search-filters/plan.md` - added `dog.size` + `dog.traits`; those
  columns are what back charge 2's tags card.

## Related Research

- None for this view. (`ui-owner-detail` never produced a `research.md`.)

## Open Questions

- Product: should "O mnie" / "Preferencje spacerów" become a real feature slice (schema +
  write-path), or be dropped from the U-06 vision? Decides whether the deferred charge ever
  reopens.
- Product: is a favorites/heart feature wanted at all? If yes it is its own slice; if no, the
  brief's heart overlay should be dropped, not rendered as a dead control.
