---
change_id: pack-consent-rls
title: Harden pack/invitation consent against RLS bypass (DB-enforced state machine)
status: implemented
created: 2026-10-14
updated: 2026-10-14
archived_at: null
---

## Notes

Scope-cut item #2 from the 2026-10-14 review (see
`context/changes/owner-location-privacy/frame.md`). The pack/invitation RLS only
checked the actor, not the state, so consent could be bypassed:

- a requester/sender could `insert` a row already `accepted` → unlocks 1:1 chat
  (`are_in_pack`) without the other party's consent;
- the addressee/receiver could rewrite participants or re-open a terminal row;
- `are_in_pack` (SECURITY DEFINER) was callable by any authenticated user for any
  pair → a membership-probing info leak.

### Fix (migration `supabase/migrations/20261014090001_harden_consent_rls.sql`)

- INSERT policies require `status = 'pending'` and the actor (`requester`/`sender`).
- UPDATE policies restrict to the addressee/receiver, only on a still-`pending` row,
  with the new status a terminal decision; `auth.uid()` wrapped per the RLS perf rule.
- BEFORE UPDATE triggers freeze participants (and invitation `type`) and enforce the
  `pending → accepted/declined` transition (WITH CHECK can't see OLD).
- `are_in_pack` gated so the caller must be one of the pair (both messages policies
  already pass `auth.uid()` as one argument, so they are unaffected).

### Verification — RED proven, GREEN gate BLOCKED

Test-first regression: `tests/integration/consent-rls.test.ts`. Run against the
current (un-hardened) remote test schema it is **RED** (4 forbidden mutations succeed
today; 1 legitimate transition passes) — the holes are real and the test catches them.
It flips **GREEN** once the migration is applied to the test database.

**Blocked:** applying the migration + running the GREEN pass needs a live Postgres —
local `supabase start` is blocked (WSL2/Docker on Win10 Home) and the remote test
project is owned by the user. To close the gate:

1. Apply the migration to the remote test project — paste
   `supabase/migrations/20261014090001_harden_consent_rls.sql` in the Dashboard SQL
   Editor (or `supabase db push`); the local `supabase/_remote_test_bundle.sql` has
   been updated with the same block.
2. `npm run test` → `tests/integration/consent-rls.test.ts` should be GREEN (5/5).
3. Apply the same migration to production before shipping.

Not doing: changing the app service layer (throwBone/respondToBone already only send
pending/decisions); Realtime; the breeding-specific flow.
