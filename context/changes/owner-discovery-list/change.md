---
id: owner-discovery-list
roadmap_id: S-03
title: "Owner discovery list"
status: done
created: 2026-09-26
updated: 2026-09-26
---

## Summary

Build the owner discovery list: a page at /owners that shows dog owners
in the logged-in user's city (with district-first fallback), each card
displaying the owner's name/photo/location and their dogs (name + breed).
Clicking a card opens a stub /owners/[id] page that will anchor the
walk-invitation button in S-04.

## Unlocks

S-04 (walk-invitation-loop) — the /owners/[id] stub is the entry point
for sending an invitation.
