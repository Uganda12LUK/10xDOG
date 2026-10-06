# ui-dog-profile (U-06) — Owner/Dog Profile Redesign Implementation Plan

## Overview

Redesign `src/pages/owners/[id].astro` — the public profile of another owner and
their dog(s), reached from the owners map/list — from a small centered card into a
hero-led profile that reuses the repo's design-system components. Scope is the four
data-backed charges from the audit; the brief's "O mnie" / "Preferencje spacerów"
sections and the heart/favorite overlay are **deferred** (no schema backing).

## Current State Analysis

The view already consumes semantic tokens correctly (hardcoded-value scan = 0 hits,
`research.md`), so this is a **component-reuse + layout** change, not theming. Today it:

- wraps everything in a centered `max-w-sm` card (`owners/[id].astro:34,45`);
- lists dogs as a raw `<ul><li>` with breed as plain text, and hides the block entirely
  when the owner has no dogs (`:66-91`);
- renders the primary action, the disabled pending state, and the back link as raw
  `<a>`/`<button>`+classes (`:99-119`) — the disabled one has no `focus-visible` ring;
- preserves three branches that must survive: `isOwnProfile` notice, owner-not-found,
  and the `pendingInvitation` gating + error banner.

Design-system surfaces to reuse: `src/components/ui/button.tsx` (`buttonVariants` cva) and
`src/components/ui/badge.tsx` (`badgeVariants` cva); tokens in `src/styles/global.css`.

## Desired End State

Visiting another owner's profile shows a full-bleed hero photo (first dog's photo, with
fallbacks), the dog's breed/size/traits as `Badge` chips in a tags card, and a sticky
footer with a primary "Zaproponuj spotkanie" CTA (disabled when an invitation is pending)
plus a secondary "Wróć" back button — both built from the button contract. An owner with no
dogs shows a real empty state instead of a blank gap. All seven UI states are visible on a
dev-only kitchen-sink page, screenshotted at desktop and one mobile width. A CLAUDE.md rule
points the next agent at the tokens, the components, and the kitchen sink.

### Key Discoveries:

- Tokens already used by role; 0 literal-colour hits on the view (`research.md`).
- `buttonVariants` / `badgeVariants` are exported (`button.tsx:50`, `badge.tsx:39`) — the
  Astro-idiomatic way to reuse the component styles on static `<a>`/`<button>`/`<span>`
  without React hydration.
- `/owners/<id>` is gated (`protected-routes.ts:1` + `middleware.ts:39-45`) — no auth work.
- Hero source decided: `dogs[0].photoUrl` → `profile.avatarUrl` → 🐾 placeholder.

## What We're NOT Doing

- **"O mnie" and "Preferencje spacerów" sections** — net-new data; no `profiles`/`dogs`
  columns exist. Deferred to a future feature slice (schema + write-path). *(FORWARD note,
  per `lessons.md`: do not pre-scaffold these here.)*
- **Heart / favorite overlay** — no favorites table or service exists. Deferred; the hero's
  top overlay carries only a functional back affordance, no dead favorite control.
- **Breeding CTA** — the breeding track (S-06–S-08) is still `proposed`; the footer carries
  only the walk-invitation CTA.
- **A CI screenshot gate** — local Supabase/dev-server is blocked, so the visual gate is a
  manual kitchen-sink screenshot this session; wiring Playwright `toHaveScreenshot` is left
  for when the runtime is unblocked.
- No changes to the owners list/map, the meeting form, or any service/API.

## Implementation Approach

Extract the presentational profile markup out of the page's data-fetching frontmatter into a
single reusable component, `src/components/owners/OwnerProfile.astro`, that takes plain props
(`profile`, `dogs`, `pendingInvitation`, `error`, `ownerId`). The page keeps its server
frontmatter and renders the component for the "other owner" branch; the kitchen-sink page
renders the same component with fixtures across every state. This gives the visual gate a
backend-free surface (sidestepping the Supabase block) and keeps one source of truth for the
markup. Buttons/badges reuse `buttonVariants` / `badgeVariants` so there is no second button.

## Phase 1: Restructure the view into a hero profile

### Overview

Extract `OwnerProfile.astro`, rebuild it as hero + body + sticky footer, and reuse the
button/badge contracts. Behavior-preserving for all existing branches.

### Changes Required:

#### 1. Extract the presentational component

**File**: `src/components/owners/OwnerProfile.astro` (new)

**Intent**: Move the "other owner" profile markup out of the page so both the real route and
the kitchen sink render identical markup from props. The page keeps data fetching; the
component is pure presentation.

**Contract**: Props `{ profile: Profile; dogs: Dog[]; pendingInvitation: boolean; error: string | null; ownerId: string }`. Renders hero + tags card + sticky footer. No data access, no `Astro.locals`.

#### 2. Hero with first-dog photo + back overlay

**File**: `src/components/owners/OwnerProfile.astro`

**Intent**: Full-bleed hero image at `aspect-[4/3]` showing `dogs[0].photoUrl`, falling back
to `profile.avatarUrl`, then the 🐾 placeholder. A back affordance overlays the top-left.

**Contract**: Hero uses token classes only (`bg-muted` for the placeholder). Back control is a
`buttonVariants({ variant: "secondary", size: "icon" })` `<a href="/owners">` overlaid on the
hero. No favorite/heart control.

#### 3. Tags card from breed/size/traits as `Badge`

**File**: `src/components/owners/OwnerProfile.astro`

**Intent**: Replace the raw dogs `<li>` list with a tags card where each dog's breed, size,
and traits render as badge chips.

**Contract**: Use `badgeVariants({ variant })` on `<span>` chips (import from
`@/components/ui/badge`). Breed → `default`; size → `secondary`; each trait → `outline`.
Keep the per-dog name + photo row; the block is replaced by an empty state when `dogs` is
empty (built in Phase 2).

#### 4. Sticky footer with primary + back CTAs

**File**: `src/components/owners/OwnerProfile.astro`

**Intent**: A footer pinned to the viewport bottom holding the primary action and a secondary
back button, so the CTA never scrolls out of reach.

**Contract**: `sticky bottom-0` (or fixed) footer, token background + top border. Primary:
`<a>` with `buttonVariants()` → `/meetings/new?receiver_id=${ownerId}`; when
`pendingInvitation`, render a `<button disabled>` with `buttonVariants()` carrying the
"Invitation sent — awaiting response" label (real `disabled:` + `focus-visible` from the cva).
Secondary: "Wróć" `buttonVariants({ variant: "outline" })` `<a href="/owners">`.

#### 5. Wire the page to the component

**File**: `src/pages/owners/[id].astro`

**Intent**: Keep the frontmatter (fetch, `isOwnProfile`, not-found); replace the inline
"other owner" markup with `<OwnerProfile ... />`. Preserve the `isOwnProfile` notice and the
owner-not-found card exactly.

**Contract**: Import and render `OwnerProfile` with the fetched `profile`, `dogs`,
`pendingInvitation`, `error`, and `ownerId`. No change to `Layout` title behavior.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Production build passes: `npm run build`

#### Manual Verification:

- Hero shows the first dog's photo; falls back to avatar, then 🐾, when absent.
- Breed/size/traits render as Badge chips; multi-dog owners still list every dog.
- Sticky footer stays visible while scrolling; primary CTA links to `/meetings/new?receiver_id=<id>`.
- Pending state shows a disabled primary button with a visible focus ring on keyboard focus.
- `isOwnProfile` notice and owner-not-found card are unchanged.

**Implementation Note**: After automated verification passes, pause for human confirmation of
the manual checks before Phase 2.

---

## Phase 2: 7-state matrix + kitchen-sink visual gate

### Overview

Add a real empty state and prove every UI state on a backend-free kitchen-sink page with
manual screenshots.

### Changes Required:

#### 1. Empty state for no dogs

**File**: `src/components/owners/OwnerProfile.astro`

**Intent**: When `dogs` is empty, show a real empty state (icon + one line) instead of hiding
the block.

**Contract**: Token-driven empty state in the tags-card slot; no layout jump vs the populated
card.

#### 2. Kitchen-sink page

**File**: `src/pages/dev/owner-profile-kitchen-sink.astro` (new, dev-only)

**Intent**: Render `OwnerProfile` with fixture props across every state, side by side, for
screenshotting without a server/Supabase dependency.

**Contract**: Guard with `import.meta.env.DEV` (return 404 otherwise). States rendered:
default, hover (note), focus-visible (note), disabled (pending), error, empty (no dogs); plus
the `isOwnProfile` and not-found branches for completeness. `loading` is **N/A** — the real
page is fully server-rendered with no client fetch (documented on the page).

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Production build passes: `npm run build`
- Kitchen-sink route responds in dev (`import.meta.env.DEV` guard returns 404 in prod).

#### Manual Verification:

- All applicable states render correctly on the kitchen-sink page (loading marked N/A).
- Desktop and one mobile-width screenshot captured and saved to the change folder.
- Empty-dogs state renders a real empty state (no blank gap, no raw JSON).
- `focus-visible` ring is visible on every control via keyboard.

**Implementation Note**: After automated verification passes, pause for human confirmation of
the screenshots before Phase 3.

---

## Phase 3: Make it stick — agent rule + value scan

### Overview

Leave a guard so the next agent keeps using tokens and components.

### Changes Required:

#### 1. UI rule in CLAUDE.md

**File**: `CLAUDE.md`

**Intent**: Add a short UI block telling future agents where tokens and components live and
the no-literal-colours rule.

**Contract**: A new section **outside** the `<!-- BEGIN @przeprogramowani/10x-cli -->` …
`<!-- END … -->` markers: tokens at `src/styles/global.css`; components at
`src/components/ui` ("check it before creating a component; add via `npx shadcn add <name>`");
"no literal colours or arbitrary values in views — use tokens"; kitchen sink at
`src/pages/dev/owner-profile-kitchen-sink.astro`.

#### 2. Hardcoded-value scan as the check

**File**: (verification only — no new dependency)

**Intent**: Confirm the cleaned view stays literal-free.

**Contract**: Run the audit scan on `owners/[id].astro` + `OwnerProfile.astro`; expect 0 hits.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Hardcoded-value scan on `src/pages/owners/[id].astro` and
  `src/components/owners/OwnerProfile.astro` returns 0 hits.

#### Manual Verification:

- CLAUDE.md UI block is present and outside the 10x-cli markers.

---

## Testing Strategy

### Manual Testing Steps:

1. Visit another owner's profile (one with dogs, one without) and verify hero/tags/footer.
2. Trigger the pending state (existing invitation) and confirm the disabled CTA + focus ring.
3. Open the kitchen-sink page in dev; screenshot desktop + mobile; eyeball each state.
4. Keyboard-tab through the view; confirm visible focus on hero back, badges (if focusable),
   and both footer CTAs.

## Migration Notes

None — no schema or data changes (the data-backed sections only; deferred items excluded).

## References

- Research: `context/changes/ui-dog-profile/research.md`
- Superseded stub: `context/changes/ui-owner-detail/change.md`
- Reused components: `src/components/ui/button.tsx:50`, `src/components/ui/badge.tsx:39`
- Tokens: `src/styles/global.css`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Restructure the view into a hero profile

#### Automated

- [ ] 1.1 Linting passes: `npm run lint`
- [ ] 1.2 Production build passes: `npm run build`

#### Manual

- [ ] 1.3 Hero shows first dog's photo with avatar → 🐾 fallbacks
- [ ] 1.4 Breed/size/traits render as Badge chips; multi-dog owners list every dog
- [ ] 1.5 Sticky footer stays visible; primary CTA links to `/meetings/new?receiver_id=<id>`
- [ ] 1.6 Pending state = disabled primary button with visible keyboard focus ring
- [ ] 1.7 `isOwnProfile` notice and owner-not-found card unchanged

### Phase 2: 7-state matrix + kitchen-sink visual gate

#### Automated

- [ ] 2.1 Linting passes: `npm run lint`
- [ ] 2.2 Production build passes: `npm run build`
- [ ] 2.3 Kitchen-sink route responds in dev; 404 in prod via `import.meta.env.DEV`

#### Manual

- [ ] 2.4 All applicable states render on the kitchen-sink page (loading marked N/A)
- [ ] 2.5 Desktop + mobile screenshots captured and saved to the change folder
- [ ] 2.6 Empty-dogs state renders a real empty state
- [ ] 2.7 `focus-visible` ring visible on every control via keyboard

### Phase 3: Make it stick — agent rule + value scan

#### Automated

- [ ] 3.1 Linting passes: `npm run lint`
- [ ] 3.2 Hardcoded-value scan on the view + `OwnerProfile.astro` returns 0 hits

#### Manual

- [ ] 3.3 CLAUDE.md UI block present and outside the 10x-cli markers
