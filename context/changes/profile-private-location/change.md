---
change_id: profile-private-location
title: Move private profile location off profiles into an owner-only table + discovery RPC
status: implementing
created: 2026-10-15
updated: 2026-10-15
archived_at: null
---

## Notes

Reviewer blocker #1 (top priority). `profiles` RLS (`profiles_select_authenticated
using (true)`, 20260923090001:34) lets any authenticated user read ANY profile's full
row via the Supabase Data API — exposing `district`, `location_lat`, `location_lng`.
`getPublicProfile()` (change owner-location-privacy) only narrows the app layer; RLS
filters rows, not columns, so a direct Data API `select *` still leaks.

Approach A (chosen): move the three private columns to an owner-only `profile_locations`
table; keep `profiles` public-safe; do geo discovery through a SECURITY DEFINER RPC that
returns only public owner IDs (coords never cross the API). Verification is DB-gated
(no local Postgres) — the A/B test is written but goes GREEN only once the migration is
applied to the test DB, like [[pack-consent-rls]].
