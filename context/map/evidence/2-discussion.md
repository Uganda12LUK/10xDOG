# Evidence: discussion

sources: gh (Uganda12LUK/10xDOG) usable + git-only. window = single day of history (all 145 commits 2026-10-16 per scan contract; forge PR/issue timestamps span 2026-09-22..2026-10-16, the real authoring calendar). No limits hit. 1 human author, so all volume is baseline not concentration.

Forge numbering is shared: issues #1-#14, PRs #15-#24 (10 PRs, all MERGED, 0 closed-unmerged). **No PR has any review or comment** (reviews:[] / comments:[] on every PR) — solo repo, self-merge, so "human review activity" is null across all capabilities (evidence).

## Buzz per capability
<!-- fix = commit subjects w/ fix|repair; PRs by title scope; plans = context/changes + archive folders by name; markers = rg TODO/FIXME/HACK/XXX/@deprecated at HEAD -->

| capability | fix commits | PRs (by title) | planning folders | debt markers | buzz |
|---|---|---|---|---|---|
| map-location | 9 (ui-owners-map×4, discovery-radius, city-norm, owner-location-privacy×2, profile-private-location via migration) | #19,#20,#21,#24 (discovery/location) | owner-location-privacy, profile-private-location, city-normalization-consistency, rename-owners-to-map, ui-owners-map, ui-owners-desktop-layout, owner-discovery-list | 2 (src/components/map) | **highest** |
| walk-invitations | 4 (meetings×2, ui-meeting-form, walk-invitation-loop) + invitation-send(#18) | #18 | ui-meeting-form, ui-meeting-form-desktop, ui-meetings-tabs, ui-invitations, meetings-ui-tokens, archive/walk-invitation-loop, archive/scheduled-meetings-view | 0 | high |
| pack-connections | 2 (pack-consent-rls DB state machine) | #15 (pack+chat) | pack-consent-rls | 0 | medium |
| discovery-search | 2 (discovery radius, shares w/ map) | #19,#20 | dog-search-filters | 0 | medium |
| owner-profile | 1 (profile-private-location) | — | archive/owner-profile, ui-profile(+desktop) | 0 | low |
| dog-profiles | 1 (dog CRUD A/B proof) | — | archive/dog-profile, ui-dog-* (×4) | 0 | low |
| auth-access | 0 | — | ui-signin, ui-signup, ui-confirm-email | 0 | low |
| messaging | 0 (foreign-read fix touched messages) | #15 | — | 0 | low |
| platform-infra | CI/seed repair (#22) + smoke(#16) + docs-ci(#17) + sentry | #16,#17,#22,#23 | sentry-monitoring, critical-path-e2e-proof, testing-bootstrap-critical-path, bootstrap-verification | 0 | medium (mechanical) |

## Friction
- **map-location is the clear friction hot-spot (evidence):** 9 fix commits, incl. 4 consecutive `fix(ui-owners-map)` (z-index bleed, margins, height, scrollbar) = UI second-attempts, and a sequence of privacy/geo re-work (`fix(discovery): scope by radius not exact city`, `fix(owner-location-privacy): close foreign-read invariant`, `fix(city-normalization): route via cityCenter()`, then the whole `profile-private-location` column-move). Also drove PRs #19 and #20 with the **same title "Feat/discovery location tweaks"** — a re-opened/re-landed slice (second attempt). The #21→#22 pair is a privacy column-move that then **broke CI** (`fix(seed): repair main CI`).
- **No reverts, no hotfixes anywhere** (evidence: 0 matches for revert|hotfix). Second attempts show up as serial fix-of-same-scope, not revert→re-land.
- **Closed-unmerged PRs: 0.** No abandoned work on the forge.
- walk-invitations: iterative impl-review triage (`fix(walk-invitation-loop): impl-review triage`, `fix(ui-meeting-form): F1-F4`) — reviewed-via-plan, not via PR.

## Planning attention
- **map-location attracts the most planning (evidence):** ~7 change folders (location-privacy, profile-private-location, city-normalization, rename-owners-to-map, discovery-list, owners-map, owners-desktop) + an `rename owners→map` architectural move. Privacy is the recurring theme.
- **walk-invitations** heavily planned: 2 archived change folders + 5 ui-* folders + the only **observability audit** (`context/audits/observability/2026-10-09_walk-invitation-loop.md`) → flow was singled out for error-visibility review.
- **Breeding loop = pure backlog (evidence):** open issues #6,#7,#8,#9 (S-06..S-08, label stream:C "Petla hodowlana") all `status:proposed`, unbuilt — PRD feature with zero code buzz. Maps to no current capability.
- Open roadmap questions (open-question label): #10 (walk-places map MVP→map-location), #12 (cold-start empty owner list→discovery/map), #13 (external account provider→auth-access), #14 (scale/data-volume→platform-infra). All still OPEN = unresolved design debt.

## Debt markers
- Repo is near-pristine: **only 2 TODO/FIXME/HACK/XXX/@deprecated at HEAD in all of src/**, both in `src/components/map`. Consistent with map-location being the live/last-touched area. All other capabilities = 0.

## Mechanical signals (demoted)
- platform-infra fix/PR volume (#16 smoke, #17 docs-ci, #22 seed-repair, #23 E2E seed) = CI/test iteration & prose, not a broken capability (false-signal 5 & 8). The `fix(seed): repair main CI` is spillover from the map-location privacy column-move (rule 12) — attributed to map-location, noted here.
- docs-planning folder churn (37 context/changes folders) is discussion, attributed to the capability each names, not ranked as its own hot area (rule 8).
- "All PRs merged, 0 review" is not quality — it is a 1-human self-merge baseline (rule 6), not a signal.

## Unknowns
- No human code review exists anywhere (solo repo) — cannot use review density to rank. inference: review happened via plan/impl-review cycle in-repo (change folders), not on the forge.
- Production error tracker: **Sentry is wired** (platform-infra, sentry-monitoring folder) but its data is out of scope for this run — real production friction per capability is unknown.
- Breeding-partner loop (issues #6-#9) is in PRD + issues but absent from capabilities.tsv/code — unbuilt, so no code-side buzz to attribute.

commands run: wc -l + grep revert|hotfix|PR-refs on git-log; gh pr list --state all --limit 100 --json ...; gh pr list --search created:<2026-10-08; gh issue list --state all --limit 100 --json ...; grep -E '^@' git-log | awk subjects | grep fix|revert|hotfix|repair; per-dir rg TODO|FIXME|HACK|XXX|@deprecated; ls context/{changes,foundation,archive,audits}.
