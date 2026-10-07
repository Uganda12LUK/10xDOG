---
change_id: rename-owners-to-map
title: Rename the /owners route to /map
status: implemented
created: 2026-10-06
updated: 2026-10-07
archived_at: null
---

## Notes

The `/owners` route shows a dog map, which is confusing (user feedback). Rename the route tree to
`/map`: the index (map) becomes `/map`, the owner-detail child `/owners/[id]` becomes `/map/[id]`.

Mechanical rename — no behavior change. Touchpoints (code only; historical `context/**` docs and the
i18n key names `owners.*` are left as-is):

- **Move routes:** `src/pages/owners/{index,[id]}.astro` → `src/pages/map/`.
- **Internal links** `/owners` → `/map`: `dashboard.astro`, `Topbar.astro`, `BottomNav.astro`,
  `meetings/new.astro`, `api/invitations/index.ts`, `MeetingsView.tsx`, the moved `[id].astro`.
- **Middleware:** `protected-routes.ts` `/owners` → `/map`.
- **Hook:** `.claude/hooks/scoped-tests-location.mjs` module prefix `src/pages/owners/` → `src/pages/map/`.
- **Living doc:** the CLAUDE.md UI rule mentions `/owners` → `/map`.
- **E2E:** `tests/e2e/invitation-loop.spec.ts` (`/owners/<id>`) + a comment in the global setup.

**Not doing:** rename i18n keys (`owners.title` etc. stay — internal), rename components
(`OwnersMapView` etc. — not user-facing), rewrite prior change/archive docs.
