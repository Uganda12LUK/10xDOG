# Critical-Path Proof Report — PawMeet

- **Date**: 2026-10-14T20:39Z
- **Commit**: `7d6589f` (branch `feat/discovery-location-tweaks`)
- **Environment**: Node v22.14.0; Vitest 3.2.7; remote throwaway Supabase **test**
  project wired via `.env.test` (`SUPABASE_TEST_URL` / `SUPABASE_TEST_SERVICE_ROLE_KEY`
  / `SUPABASE_TEST_ANON_KEY`); integration tests create/delete their own auth users via
  the admin API. No local Docker (WSL2 blocked on Win10 Home).
- **Scope**: the critical flow — signup/login → profile → dog → discover another owner
  → invite → accept by the second person → meeting visible to both.

## Update — 2026-10-16: browser E2E GREEN (gate closed)

- **Commit**: `8285942` (main, post-merge) · **Runner**: Playwright, 1 worker, port 4330
- **Environment**: remote test Supabase (`.env.test`) with BOTH hardening migrations
  applied (`20261014090001`, `20261015090001`); production-like `astro build` + preview.
- **Result**: **10 passed (2.8m), 0 failed, 0 skipped.**
  - `invitation-loop` — *User A invites User B, User B accepts, **both see the meeting*** ✓ (the full invite→accept→meeting-visible-to-both journey, in a real browser)
  - `pack-chat-loop` — *A throws a bone, B catches it, both chat in their pack* ✓ (pack consent + `are_in_pack` chat unlock)
  - 8× `auth-gate` route-protection specs ✓
- Required one fix: `tests/setup/playwright-global-setup.ts` dropped the `profiles.district`
  seed field (removed by the profile-private-location migration).

The browser gate below is now **closed**. Original verdict retained for history:

## Verdict

**Partially proven (2026-10-14) → fully proven in the browser (2026-10-16).** The consent
tail the review most cared about — invite → accept → "both parties see exactly one
meeting" — was first proven by an integration test, and is now proven end-to-end in a
real browser (invitation-loop + pack-chat-loop GREEN). Earlier stages (profile/dog,
discovery) are covered at unit/service level; the browser journey exercises the owner
detail (`getPublicProfile`), meeting proposal, pack and chat paths against the migrated
schema.

## Stage coverage matrix

| # | Stage | Covered by | Layer | This session |
|---|-------|-----------|-------|--------------|
| 1 | Signup / login / route protection | `tests/integration/auth-gating.test.ts` (8) | integration | ✅ RUN 8/8 |
| 1 | Full signup→signin→protected→signout | `scripts/smoke.mjs` (`npm run smoke`) | http | ⏭ not run (needs running server) |
| 2 | Profile create/edit | `tests/e2e/invitation-loop.spec.ts`, `seed.spec.ts` | browser | ⏭ not run |
| 2 | Profile privacy (no street/coords to others, app layer) | `tests/unit/publicProfile.test.ts` (2), `locationPrivacy.test.ts` (2) | unit | ✅ RUN 4/4 |
| 3 | Dog CRUD + cross-owner denial | `tests/integration/dog-crud.test.ts` (5) | integration | ✅ RUN 5/5 |
| 3 | Dog create (in-browser) | `tests/e2e/*` | browser | ⏭ not run |
| 4 | Discover another owner (filter/distance/city) | `tests/unit/discovery.test.ts` (10), `dogFilter.test.ts` (9) | unit | ✅ RUN 19/19 |
| 5 | Invite (send) | `tests/integration/invitation-state-machine.test.ts` | integration | ✅ RUN |
| 6 | Accept by the second person | `tests/integration/invitation-state-machine.test.ts` | integration | ✅ RUN |
| 7 | **Meeting visible to both** | `invitation-state-machine.test.ts › "Both parties see exactly 1 meeting after accepting"` | integration | ✅ RUN GREEN |
| 8 | Pack consent / chat unlock | `tests/integration/consent-rls.test.ts`; `tests/e2e/pack-chat-loop.spec.ts` | integration/browser | ⚠ RED-pending (see `pack-consent-rls`) / ⏭ browser not run |

## Tests RUN this session (commit 7d6589f)

| Suite | Result |
|-------|--------|
| `tests/unit/*` (publicProfile 2, locationPrivacy 2, discovery 10, dogFilter 9) | 23/23 ✅ |
| `tests/integration/auth-gating.test.ts` | 8/8 ✅ |
| `tests/integration/invitation-state-machine.test.ts` | 4/4 ✅ |

Key assertions (invitation-state-machine, verbatim outcomes):
- "User B sees User A's invitation in inbox" — ✅
- "Meetings tab shows 0 rows while invitation is pending" — ✅
- "Meetings tab shows 0 rows after declining" — ✅
- "Both parties see exactly 1 meeting after accepting" — ✅ (asserts `meetingsA[0].id === meetingsB[0].id`)

## Tests SKIPPED (and why)

- **Playwright browser E2E** (`tests/e2e/`: `auth-gate-routes`, `invitation-loop`,
  `pack-chat-loop`, `seed`). Not run this session. Reasons: the suite mutates the
  remote test project (admin create/delete users) and the project owner deferred the
  destructive run; running Playwright unattended under Claude Code is unreliable
  (preview forced to background, stale-`dist` route 404 — see project memory). This is
  the one journey-level gate still open.
- **`consent-rls.test.ts`** — intentionally RED until migration
  `20261014090001_harden_consent_rls.sql` is applied to the test DB (change
  `pack-consent-rls`); it is not a critical-path regression but gates stage 8.
- **`npm run smoke`** — needs a running server; not started this session.

## Open gate — how to close the full browser proof

1. `rm -rf dist` then `npm run build` (avoid stale-dist 404 — project memory).
2. Apply the `pack-consent-rls` migration to the remote test project first (so stage 8
   passes).
3. Drive the browser journey with `/10x-e2e` (or `npm run e2e`) against the remote test
   project — foreground via `ASTRO_PREVIEW_BACKGROUND=1 --ignore-lock` on IPv4
   `127.0.0.1` (project memory: "Playwright preview foreground").
4. Re-stamp this report with the Playwright pass (expected `*.spec.ts` suite green) and
   the commit it ran at.
