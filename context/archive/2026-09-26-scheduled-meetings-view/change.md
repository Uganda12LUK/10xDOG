---
id: scheduled-meetings-view
roadmap_id: S-05
title: "Scheduled meetings view"
status: archived
archived_at: 2026-09-26T13:07:46Z
created: 2026-09-26
updated: 2026-09-26
---

## Summary

Build the `/meetings` page showing all confirmed meetings (accepted invitations,
both walk and breeding type) for the logged-in user. Reads the existing
`invitations` table — no new migration. Adds a service function, a new Astro page,
a Topbar nav link, and a PROTECTED_ROUTES entry.

## Unlocks

S-08 (breeding-inquiry-loop) — confirmed breeding inquiries appear in the same
meetings tab without modifying the page (all types shown from day one).
