---
change_id: dog-profile
title: Dog profile (create + edit) — S-02
status: implementing
created: 2026-09-24
updated: 2026-09-24
archived_at: null
---

## Notes

- Roadmap item **S-02** (`dog-profile`), Stream A, PRD FR-003 / US-01.
- Prerequisite F-01 satisfied by S-01 (owner-profile, archived): migrations workflow + RLS pattern + `avatars` bucket already live.
- Planned via `/10x-plan S-02` on 2026-09-24.
- Key decisions: many dogs per user (`owner_id → auth.users.id`); breed from a controlled in-code list (zod-validated); age stored as birthdate; photo reuses the `avatars` bucket under `<uid>/dogs/...`; UI is a `/dogs` section (list + add/edit).
