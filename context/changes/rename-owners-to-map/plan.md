# Rename /owners → /map — Implementation Plan

## Overview

Rename the dog-map route tree from `/owners` to `/map` (index + `[id]` owner-detail child) and update
every internal link, the protected-routes list, the test-scoping hook, the CLAUDE.md UI rule, and the
e2e test. Pure rename — no behavior change.

## What We're NOT Doing

- No i18n key rename (`owners.*` keys stay — internal names, not routes).
- No component rename (`OwnersMapView` etc. — not user-facing).
- No rewrite of historical `context/**` change/archive docs.

## Phase 1: Rename route and update references

### Changes Required:

**1. Move route files** — `git mv src/pages/owners/{index,[id]}.astro src/pages/map/`

**2. Links `/owners` → `/map`** — `src/pages/map/[id].astro`, `src/pages/meetings/new.astro`,
`src/pages/api/invitations/index.ts`, `src/components/Topbar.astro`, `src/components/BottomNav.astro`,
`src/components/meetings/MeetingsView.tsx`, `src/pages/dashboard.astro`. Covers bare `/owners` and
`/owners/${id}` forms.

**3. Middleware** — `src/lib/protected-routes.ts`: `/owners` → `/map`.

**4. Hook** — `.claude/hooks/scoped-tests-location.mjs`: module prefix `src/pages/owners/` → `src/pages/map/`.

**5. Living doc** — `CLAUDE.md` UI rule: `/owners` → `/map`.

**6. E2E** — `tests/e2e/invitation-loop.spec.ts`: `/owners/<id>` → `/map/<id>`; comment in
`tests/setup/playwright-global-setup.ts`.

### Success Criteria:

#### Automated Verification:

- No `/owners` references remain in `src/`, `tests/`, `.claude/hooks/`, or `CLAUDE.md` (grep)
- Linting passes: `npm run lint`
- Build passes: `npm run build` (routes resolve under `/map`)

#### Manual Verification:

- `/map` serves the dog map; `/map/<ownerId>` serves the owner detail
- Nav (Topbar + BottomNav), dashboard tile, and the meeting-form back links all go to `/map`
- A logged-out hit on `/map` still redirects to sign-in (middleware)

## References

- Related: `context/changes/ui-owners-desktop-layout/`, `context/changes/ui-meeting-form-desktop/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Rename route and update references

#### Automated

- [x] 1.1 No `/owners` references remain in src/ tests/ .claude/hooks/ CLAUDE.md
- [x] 1.2 Linting passes: `npm run lint`
- [x] 1.3 Build passes: `npm run build`

#### Manual

- [ ] 1.4 /map serves the map; /map/<id> serves the owner detail
- [ ] 1.5 Nav, dashboard tile, and meeting-form back links go to /map
- [x] 1.6 Logged-out /map redirects to sign-in (curl: /map → 302, /map/<id> → 302, old /owners → 404)
