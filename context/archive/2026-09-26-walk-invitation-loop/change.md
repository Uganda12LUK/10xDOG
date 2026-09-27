---
id: walk-invitation-loop
roadmap_id: S-04
title: "Walk invitation loop"
status: archived
created: 2026-09-26
updated: 2026-09-27
archived_at: 2026-09-27T19:47:27Z
---

## Summary

Build the walk-invitation loop: a logged-in user can send a walk invitation
to another owner from /owners/[id], the receiver sees it in a new /invitations
inbox, and can accept or decline. The invitation type column ('walk'|'breeding')
is designed for reuse by S-08 (breeding inquiry loop).

## Unlocks

S-05 (scheduled-meetings-view) — confirmed invitations become meetings visible
in the meetings tab.
S-08 (breeding-inquiry-loop) — reuses the same invitations table and state
machine with type='breeding'.
