---
change_id: ui-meeting-form-desktop
title: Desktop layout + dog-nose pin + English strings for the propose-meeting page
status: implementing
created: 2026-10-05
updated: 2026-10-05
archived_at: null
---

## Notes

/10x-ui change (sibling of [[ui-owners-desktop-layout]]). **One view:** `/meetings/new`
(`src/pages/meetings/new.astro` + `src/components/meetings/MeetingForm.tsx`). Token source:
`src/styles/global.css`; components: `src/components/ui/`.

Follow-up to the /owners desktop work the user approved ("tu jest super"), applying the same
treatment here. Three charges (user-requested):

1. **Desktop layout** — `new.astro` wraps the form in `max-w-sm`, so on desktop it stays a narrow
   phone column. Widen + lay out form fields beside a larger location map on `lg:`.
2. **Meeting-location pin** — `MeetingForm.tsx:17-22` uses a bare `📍` emoji `divIcon`. Replace with
   a brand-colored dog-in-profile SVG with a long snout whose **nose tip is the anchor**, pointing
   at the chosen spot. Matches the app style like the /owners doghouse marker.
3. **English strings** — `new.astro` has hardcoded Polish (title, "Nie wybrano właściciela",
   "← Wróć do listy", "Nie znaleziono właściciela", "← Wróć do profilu", "Zaproponuj spotkanie: …",
   "Ładowanie formularza…"). The app serves English now (Polish disabled, commit 311ffcd), so these
   show PL on an EN app. Move to i18n keys (EN), keeping en.ts/pl.ts key parity.

**Not doing:** the broader 5.3 i18n pass (other views' stray PL, e.g. OwnersMapView "Zaproponuj
spacer", BottomSheet "właściciel:") — only `/meetings/new` here. No data/schema/API change.

**Deferred from the sibling change:** `ui-owners-desktop-layout` Phase 3 (screenshots + the shared
CLAUDE.md UI guard rule) is closed together with this change's visual gate / rule step.
