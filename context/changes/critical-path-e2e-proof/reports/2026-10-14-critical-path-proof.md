# Critical-Path Proof Report — PawMeet

- **Status**: ✅ **CLOSED — fully proven end-to-end in a real browser.**
- **Evidence commit**: `0243965` (current HEAD on `feat/discovery-location-tweaks`) — re-proven
  2026-10-19 after the onboarding-wizard, calendar/dog-events and required-city work (and the
  e2e/smoke test updates those drove) landed on top of the 2026-10-17 proof (`0454bce`).
  Originally closed on `8285942` (main, post-merge) by `efe6d46`
  (`test(critical-path-e2e-proof): browser E2E GREEN`); each re-run re-drives the full journey,
  so the SHA tracks a real pass, never a bumped label.
- **Last run**: 2026-10-19 · Playwright, 1 worker, port 4330 — **13/13 passed** (2.6m), on a fresh
  `clean:dist && astro build && preview`. Alongside: `npm run test:rls` 17/17,
  `vitest run tests/integration` 39/39, unit 35/35, `npm run lint` clean,
  `astro check` 0 errors / 0 warnings / 0 hints (121 files).
- **Environment**: Node v22.14.0; Vitest 3.2.7 / Playwright. Remote throwaway Supabase
  **test** project wired via `.env.test` (`SUPABASE_TEST_URL` /
  `SUPABASE_TEST_SERVICE_ROLE_KEY` / `SUPABASE_TEST_ANON_KEY`), with BOTH hardening
  migrations applied (`20261014090001_harden_consent_rls`,
  `20261015090001_profile_private_location`). Production-like `astro build` + preview.
  Integration tests create/delete their own auth users via the admin API. No local
  Docker (WSL2 blocked on Win10 Home).
- **Scope**: the critical flow — signup/login → profile → dog → discover another owner
  → invite → accept by the second person → meeting visible to both → pack consent → chat.

## Verdict

**Fully proven.** The invite → accept → "both parties see exactly one meeting" journey —
the consent tail the review most cared about — is proven end-to-end in a real browser
(`invitation-loop` + `pack-chat-loop` GREEN), on top of the migrated private-location
schema. Earlier stages (profile/dog, discovery) are additionally covered at
unit/service/integration level.

## Stage coverage matrix

| # | Stage | Covered by | Layer | Result |
|---|-------|-----------|-------|--------|
| 1 | Signup / login / route protection | `tests/e2e/auth-gate-routes.spec.ts` (8); `tests/integration/auth-gating.test.ts` (8) | browser / integration | ✅ GREEN |
| 1 | Full signup→signin→protected→signout | `scripts/smoke.mjs` (`npm run smoke`) | http | ✅ GREEN in CI (smoke job) |
| 2 | Profile create/edit | `tests/e2e/invitation-loop.spec.ts`, `seed.spec.ts` | browser | ✅ GREEN |
| 2 | Profile privacy (no street/coords to others) | `tests/unit/publicProfile.test.ts` (2), `locationPrivacy.test.ts` (2); `tests/integration/profile-location-privacy.test.ts` (4) | unit / integration (DB boundary) | ✅ GREEN |
| 3 | Dog CRUD + cross-owner denial | `tests/integration/dog-crud.test.ts` (5) | integration | ✅ GREEN |
| 3 | Dog create (in-browser) | `tests/e2e/*` | browser | ✅ GREEN |
| 4 | Discover another owner (filter/distance/city) | `tests/unit/discovery.test.ts` (10), `dogFilter.test.ts` (9) | unit | ✅ GREEN |
| 5 | Invite (send) | `tests/integration/invitation-state-machine.test.ts`; `tests/e2e/invitation-loop.spec.ts` | integration / browser | ✅ GREEN |
| 6 | Accept by the second person | `invitation-state-machine.test.ts`; `invitation-loop.spec.ts` | integration / browser | ✅ GREEN |
| 7 | **Meeting visible to both** | `invitation-state-machine.test.ts › "Both parties see exactly 1 meeting after accepting"`; `invitation-loop.spec.ts` | integration / browser | ✅ GREEN |
| 8 | Pack consent / chat unlock | `tests/integration/consent-rls.test.ts`; `tests/e2e/pack-chat-loop.spec.ts` | integration / browser | ✅ GREEN |

## Tests RUN (2026-10-19 · commit `0243965`, current HEAD)

Full green re-drive after the onboarding/calendar/required-city work. Playwright, 1 worker,
port 4330, remote test Supabase, production-like `clean:dist && astro build && preview`:

**13 passed (2.6m), 0 failed, 0 skipped** — 10× `auth-gate` route-protection specs (now incl.
`/onboarding`, `/settings`, `/calendar`), `invitation-loop` (invite→accept→meeting visible to
both), `pack-chat-loop` (bone→catch→pack chat), `seed`.

Non-browser layers, same commit:

| Suite | Result |
|-------|--------|
| `tests/unit/*` (dogEvents 8, locationPrivacy 2, publicProfile 2, discovery 10, dogFilter 13) | 35/35 ✅ |
| `vitest run tests/integration` (auth-gating 11, invitation-state-machine 4, dog-crud 5, profile-location-privacy 4, dog-events 3, messages-unread 4, consent-rls 8) | 39/39 ✅ |
| `npm run test:rls` (consent-rls, dog-crud, profile-location-privacy) | 17/17 ✅ |
| `npm run lint` | clean ✅ |
| `astro check` | 0 errors / 0 warnings / 0 hints (121 files) ✅ |

## Tests RUN (browser gate, 2026-10-16 · commit `8285942`)

Playwright, 1 worker, port 4330, remote test Supabase, production-like build + preview:

**10 passed (2.8m), 0 failed, 0 skipped.**

- `invitation-loop` — *User A invites User B, User B accepts, **both see the meeting*** ✓
  (the full invite→accept→meeting-visible-to-both journey, in a real browser)
- `pack-chat-loop` — *A throws a bone, B catches it, both chat in their pack* ✓
  (pack consent + `are_in_pack` chat unlock)
- 8× `auth-gate` route-protection specs ✓

Required one fix: `tests/setup/playwright-global-setup.ts` dropped the `profiles.district`
seed field (removed by the profile-private-location migration).

## Tests RUN (non-browser layers · commit `7d6589f`)

| Suite | Result |
|-------|--------|
| `tests/unit/*` (publicProfile 2, locationPrivacy 2, discovery 10, dogFilter 9) | 23/23 ✅ |
| `tests/integration/auth-gating.test.ts` | 8/8 ✅ |
| `tests/integration/invitation-state-machine.test.ts` | 4/4 ✅ |
| `tests/integration/dog-crud.test.ts` | 5/5 ✅ |
| `tests/integration/profile-location-privacy.test.ts` (DB boundary) | 4/4 ✅ |
| `tests/integration/consent-rls.test.ts` (after `20261014090001` applied) | ✅ |

Key assertions (invitation-state-machine, verbatim outcomes):
- "User B sees User A's invitation in inbox" — ✅
- "Meetings tab shows 0 rows while invitation is pending" — ✅
- "Meetings tab shows 0 rows after declining" — ✅
- "Both parties see exactly 1 meeting after accepting" — ✅ (asserts `meetingsA[0].id === meetingsB[0].id`)

> The RLS / DB-boundary suite (`consent-rls`, `dog-crud`, `profile-location-privacy`) now
> also runs automatically in CI's `smoke` job against a local Supabase (`npm run test:rls`).

---

## History — partial proof (2026-10-14, commit `7d6589f`)

This report began as a **partial** proof. At that point the consent tail was proven by an
integration test (`invitation-state-machine`), but the browser journey had **not** been
run, so the journey-level gate was still open. The original verdict read:

> **Partially proven.** The consent tail the review most cared about — invite → accept →
> "both parties see exactly one meeting" — was proven by an integration test. Earlier
> stages (profile/dog, discovery) are covered at unit/service level; the browser journey
> was not yet exercised.

Deferred at the time (now resolved):

- **Playwright browser E2E** (`auth-gate-routes`, `invitation-loop`, `pack-chat-loop`,
  `seed`) — not run on 2026-10-14 (the destructive remote run was deferred, and running
  Playwright unattended under Claude Code was unreliable). **Run and GREEN on 2026-10-16.**
- **`consent-rls.test.ts`** — intentionally RED until migration
  `20261014090001_harden_consent_rls.sql` was applied to the test DB. **Applied; GREEN.**
- **`npm run smoke`** — needed a running server; not started that session. **Now runs in
  CI's smoke job.**

The steps originally listed to close the gate (clean `dist`, apply the `pack-consent-rls`
migration, drive the browser journey, re-stamp with the Playwright pass) were all carried
out; see the 2026-10-16 run above.
