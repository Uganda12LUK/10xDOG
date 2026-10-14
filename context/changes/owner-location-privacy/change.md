---
change_id: owner-location-privacy
title: Stop leaking owners' street & exact GPS to other users (column-level privacy)
status: impl_reviewed
created: 2026-10-14
updated: 2026-10-14
archived_at: null
---

## Notes

Leading concern from a 5-item review (2026-10-14), framed via /10x-frame. The PRD
guarantees that an owner's street address and precise GPS are never visible to
other users. They currently are: `listOwners` / `listProfilesByIds` do `select("*")`
and the mapped `Profile` carries `street` (DB `district`) + exact `location_lat/lng`;
`OwnerProfile.astro:25` renders another owner's street. RLS scopes *rows*, not
*columns*, so the fix is a narrowed public shape, not a policy tweak.

Sibling concerns from the same review are split into their own changes (see
frame.md → Scope Cut): pack/invitation consent RLS, city-normalization consistency,
the critical-path E2E proof, and stale README/AGENTS docs.
