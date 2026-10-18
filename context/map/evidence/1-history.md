# Evidence: history

Window: 12mo..HEAD, effective 2026-10-16 only (whole git history is one calendar day; history squashed/initialized that day) — **time-trend signal is null, all commits are one bucket**. HEAD=32daad6. Commits counted: 145 (no merges; 0 bots; 0 agent-authored — Claude is only a Co-authored-by trailer). File-changes counted: 859 live (after noise filter). Excluded: `*.scaffold`, `package-lock.json`, `dist/`/`build/`/`.astro/`, `__snapshots__`, binary media. 1 human author → all concentration/ownership stats are baseline, not findings.

## Activity per capability  (evidence)
Attribution: capabilities.tsv globs-first then longest prefix; `owners`→`map` path-fold applied; commits counted once per cap touched. Unmapped = 303/859 changes (35%), of which .claude/ agent tooling 147 + tests/ 30 + root config (package.json, CLAUDE/README/AGENTS, astro.config, wrangler) ~70 + product chrome not in a footprint (Topbar 13, dashboard 7, BottomNav 6, DogForm 4) — tooling/config/chrome, not a missing product capability. Agent-authored share = 0%.

| cap | commits | file-changes |
|---|---|---|
| docs-planning (bucket) | 116 | 266 |
| map-location | 29 | 54 |
| shared-foundations (bucket) | 26 | 35 |
| walk-invitations | 25 | 42 |
| owner-profile | 20 | 30 |
| auth-access | 17 | 42 |
| dog-profiles | 12 | 32 |
| platform-infra | 10 | 15 |
| i18n | 10 | 20 |
| pack-connections | 5 | 11 |
| discovery-search | 4 | 4 |
| messaging | 2 | 5 |

docs-planning leads by design (every change writes a change.md/plan.md) — **mechanical, not a hot code area** (false-signal 8). Among real product code, **map-location is the busiest capability**, then walk-invitations and owner-profile.

## Top files in top capabilities  (evidence, all live at HEAD)
- map-location: OwnersMapView.tsx(11), index.astro(8), DogMap.tsx(8), map/[id].astro(8)
- walk-invitations: meetings/index.astro(8), meetings/new.astro(6), api/invitations/index.ts(6), MeetingsView.tsx(5)
- owner-profile: services/profile.ts(10), ProfileForm.tsx(6), profile.astro(6), OwnerProfile.astro(4)
- auth-access: middleware.ts(11), protected-routes.ts(4), signin/signup.astro(4 each)
- dog-profiles: dogs/[id].astro(5), dogs/new.astro(5), dogs/index.astro(5), services/dog.ts(4)
- shared-foundations: types.ts(13), global.css(7), Layout.astro(6)

## Trend  (unknown)
Single-day effective window — cannot label constant/rising/fading. Commit-subject campaigns visible as sequential scopes: i18n-and-dog-map (p1–p7), dog-search-filters, ui-* desktop-layout run, sentry-monitoring (p1–p5), owner-location-privacy + profile-private-location + pack-consent-rls (the recent privacy/RLS hardening push).

## Fix pressure  (evidence)
Heuristic: subject matches `\b(fix|bug|hotfix|revert|regression|broken|incident)`; counted for every cap the commit touches. **Reverts = 0 across the entire repo** (so false-signal 12 spillover is moot). Cross-cutting fixes are few.

| cap | fix commits / total | fix % |
|---|---|---|
| messaging | 1/2 | 50% (tiny n) |
| pack-connections | 2/5 | 40% (tiny n) |
| walk-invitations | 7/25 | 28% |
| discovery-search | 1/4 | 25% (tiny n) |
| map-location | 7/29 | 24% |
| owner-profile | 2/20 | 10% |
| platform-infra | 1/10 | 10% |
| auth-access | 0/17 | 0% |
| dog-profiles | 0/12 | 0% |

Read subjects (false-signal 5): the map-location and walk-invitations fixes are **substantive logic/security fixes**, not CI/UI iteration — owner-location-privacy foreign-read invariant, city-normalization radius vs exact-string, consent/RLS state machine, surfacing invitation-send failures. So walk-invitations (28%, n=25) and map-location (24%, n=29) are **genuine fix-pressure zones**. pack/messaging/discovery high % are tiny-n noise.

## Co-change between capabilities  (evidence)
Co-change rule: commits touching >half of all caps dropped. Confidence = shared ÷ commits of less-active side. docs-planning pairs omitted here (false-signal 8: docs is discussion, co-changes with everything because every change has a plan folder — conf 62–83% with every cap, mechanical). **Code-only pairs (docs excluded):**

| pair | support | confidence |
|---|---|---|
| map-location + owner-profile | 9 | 45% |
| owner-profile + shared-foundations | 9 | 45% |
| map-location + shared-foundations | 6 | 23% |
| auth-access + owner-profile | 6 | 35% |
| map-location + walk-invitations | 6 | 24% |
| auth-access + map-location | 5 | 29% |

Strongest real corridor: **map-location ↔ owner-profile** (owner location lives on the profile; the privacy work moved location off `profiles` into an owner-only table + discovery RPC, touching both). owner-profile ↔ shared-foundations reflects `types.ts`/public-shape edits.

## Hub files and freshness  (evidence — all live at HEAD)
Files co-changing with many capabilities (≥2 commits):

| file | distinct caps | commits | nature |
|---|---|---|---|
| src/types.ts | 12 | 13 | shared DTO/entity types — fan-in by design (false-signal 2) |
| src/lib/i18n/{pl,en}.ts | 12 | 9 each | translation catalogs — every UI string touches them (rule 3, guarded corridor) |
| src/pages/meetings/{index,new}.astro | 11 | 8/6 | walk-invitations views |
| src/pages/map/index.astro | 11 | 8 | map view |
| src/layouts/Layout.astro | 11 | 6 | app shell |
| src/components/profile/ProfileForm.tsx | 11 | 6 | owner-profile form |
| src/components/BottomNav.astro | 11 | 6 | nav chrome (unmapped) |

Freshness: all named hub/top files return `git cat-file -e HEAD:<path>` = exists. One rename folded: `src/pages/owners/*`→`src/pages/map/*` (R097/R084, commit 7e09d7b), attributed to map-location.

## Mechanical signals (demoted, not ranked)
- **docs-planning #1 in volume AND co-changes with every cap at 62–83% conf** — false-signal 8 (prose/planning churn) + the change-folder workflow. Reported as volume, excluded from code co-change and risk.
- **types.ts / i18n catalogs as 12-cap hubs** — false-signals 2 & 3 (config/translation fan-in, guarded by TS build & t() helper). Coupling by design, not hidden contract.
- **messaging/pack/discovery high fix %** — tiny n (2–5 commits); false-signal baseline, not a broken capability.
- All concentration stats baseline-only: 1 human author.

## Unknowns
- No time-trend possible (1-day history) — rising/fading unknowable; recommend a longer-history source if the pre-squash repo exists.
- Co-change cannot reveal pairs that *should* change together but don't: a Supabase migration/RLS policy vs the service that reads it, or `types.ts` vs the SQL schema — no in-repo guard proves these stay in sync (candidate structure/people follow-up).
- 35% unmapped (mostly .claude tooling + tests + root config); product share of unmapped is small chrome files (Topbar/dashboard/BottomNav). Footprints need no refinement for product caps.

## Commands run
`git rev-parse --short HEAD`; `git log --no-merges --oneline | wc -l`; `git -c core.quotepath=off log --no-merges -M --name-status --format=... > log-namestatus.txt`; python attribution over log-namestatus.txt + capabilities.tsv (change/commit/fix/revert/co-change/hub counts); `git cat-file -e HEAD:<path>` for each named file; Grep over git-log.txt for fix/revert subjects.
