---
change_id: ui-meeting-form
title: Propose meeting form with mini map and participant options
status: implementing
created: 2026-09-27
updated: 2026-09-30
archived_at: null
---

## Notes

Prerequisites: ui-owners-map (DogMap reuse), ui-meetings-tabs (FAB links here).
Nowa strona /meetings/new. MeetingForm.tsx: wybór psa, mini mapa, data+czas, typ, chipy psów, limit toggle.
API: POST /api/meetings (zod). Migracja meetings jeśli tabela nie istnieje.
