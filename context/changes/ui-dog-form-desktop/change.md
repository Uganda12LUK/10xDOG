---
change_id: ui-dog-form-desktop
title: Desktop layout for the add/edit dog form
status: implementing
created: 2026-10-06
updated: 2026-10-06
archived_at: null
---

## Notes

/10x-ui change (sibling of [[ui-profile-desktop]]). **View:** the dog form, shared by
`/dogs/new` and `/dogs/[id]` (edit) — `src/pages/dogs/new.astro`, `src/pages/dogs/[id].astro`,
`src/components/dogs/DogForm.tsx`.

Same phone-on-desktop problem as profile: both pages center a `max-w-sm` card and `DogForm` is a
single `space-y-4` column. Widen the card on `lg:` and lay the fields out in two columns.

- `new.astro` + `[id].astro`: card `max-w-sm` → `max-w-sm lg:max-w-3xl`.
- `DogForm`: two-column `lg:grid` — left: name, breed, size; right: traits, birthdate, photo.
  ServerError + submit full width. Mobile unchanged.

**Not doing:** no i18n (DogForm already uses t()), no data/schema/validation change, no marker work.
