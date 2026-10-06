---
change_id: ui-dog-profile
title: Dog profile page with hero image and sticky action footer
status: planned
created: 2026-09-27
updated: 2026-10-05
archived_at: null
---

## Notes

Prerequisite: ui-tokens-nav.
Rebuild owners/[id].astro: hero foto aspect-[4/3], back + heart overlay, karta z tagami, sekcje "O mnie" + "Preferencje spacerów", sticky footer z dwoma CTA.

## Target & contract (10x-ui, 2026-10-05)

- **View (one):** `src/pages/owners/[id].astro` — the public profile of another owner + their dog(s), reached from the owners map/list. (`dogs/[id].astro` is the edit form, owned by `ui-dog-detail`.)
- **Token source:** `src/styles/global.css` (`@theme` / `:root`, Koralowa-smycz palette from U-01). Hardcoded-value scan on the view = 0 hits — tokens are already clean; this is a structural/component change, not a theming one.
- **Components:** reuse `src/components/ui/{button,badge}.tsx`. Note: `badge.tsx` currently has broken imports (`"cn"` / `"radix-ui"` vs `button.tsx`'s `@/lib/utils` / `@radix-ui/react-slot`) — fix before reuse.
- **Supersedes:** `ui-owner-detail` (same view).
