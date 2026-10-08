---
change_id: ui-profile-desktop
title: Desktop layout + shared home marker for Your profile
status: implementing
created: 2026-10-06
updated: 2026-10-06
archived_at: null
---

## Notes

/10x-ui change (sibling of [[ui-owners-desktop-layout]], [[ui-meeting-form-desktop]]).
**One view:** `/profile` (`src/pages/profile.astro` + `src/components/profile/ProfileForm.tsx`).

Two user-requested fixes:

1. **Desktop layout** — `profile.astro` centers a `max-w-sm` card, so desktop shows a phone-width
   column. Widen + two-column (text fields beside the location map) on `lg:`.
2. **Home marker** — the profile location picker uses a bare `📍` emoji (`ProfileForm.tsx:16-21`).
   Replace with the **buda (doghouse)** marker already used for the user's home on `/map`
   (`DogMap.tsx` userIcon). Extract that icon into a shared module so both read one source (no
   duplication) — satisfies the CLAUDE.md "reuse, don't reinvent" rule.

**Not doing:** i18n (profile strings already use t()/English), no data/schema change, no change to
the save flow. Not touching the meeting-form dog-nose pin.
