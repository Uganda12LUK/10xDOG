# Evidence: people

**humans_in_window = 1.** Two git identities — `lmajers` (144 commits) and `lukasM`
(1 commit, the "Initial commit") — are the **same person** (merged by e-mail,
privately). [evidence: `git shortlog -sne`, `git log --author=lukasM`]
**Baseline, not a finding:** with a single human author, every ownership /
bus-factor / concentration statistic is mechanical. **Bus-factor analysis is
not-applicable for a solo project** (false-signals rule 6: ≤3 humans → concentration
is the baseline). No bots, no agent-authored commits — Claude appears only as a
`Co-authored-by` trailer on human commits (100 of 145 no-merge commits, 69%).

## People per capability

Every capability below is **100% authored by the single human (`lmajers`)** — the
only differentiator is volume and agent-co-authorship share, not who to ask.
Active period: 2026-09-19 .. 2026-10-16 (committer dates; author dates squashed to
one day per contract). [evidence: `git log --format=%aN -- <paths>`]

| Capability (crit.) | Commits | Agent co-auth | Sole author |
|---|---|---|---|
| map-location (HIGH) | 26 | 16 | lmajers |
| walk-invitations (HIGH) | 24 | 12 | lmajers |
| auth-access (HIGH) | 17 | 11 | lmajers |
| owner-profile (HIGH) | 16 | 12 | lmajers |
| dog-profiles (HIGH) | 11 | 9 | lmajers |
| platform-infra (HIGH) | 11 | 10 | lmajers |
| i18n (MEDIUM) | 10 | 6 | lmajers |
| discovery-search (HIGH) | 4 | 4 | lmajers |
| pack-connections (HIGH) | 3 | 3 | lmajers |
| messaging (MEDIUM) | 2 | 2 | lmajers |
| shared-foundations (bucket) | 26 | 18 | lmajers |
| docs-planning (bucket) | 116 | 77 | lmajers |

(Migrations under `supabase/migrations/*`: 12 commits, all `lmajers`.)

## Concentration — against the baseline

Solo project: concentration is the baseline, **not** a finding. Every capability
has exactly one person who has ever touched it (the same person). Listing
"single-person capabilities" is vacuous here — it is all of them. No bus-factor
language applies; there is no second contributor to compare a share against.

## Agent co-authorship (context, not a filter)

Agent `Co-authored-by` (Claude) is present on the majority of commits — highest in
buckets/docs (docs-planning 77/116, shared-foundations 18/26) and steadily ~1/2–2/3
in feature capabilities. This reflects AI-assisted authorship, not a second human.
The human steered every change; the trailer is kept, not filtered.

## Implications

- **Whom to ask before any change: `lmajers` (the sole author).** There is no
  distribution of expertise to route by capability — one person carries all 12.
- "Who already tried this" = read that capability's own commit history / the
  `context/changes/<id>/` folder; there is no second author who may have attempted it.
- Highest human activity (likely most context to recall): map-location,
  walk-invitations, auth-access, owner-profile.

## Unknowns

- Formal ownership / current team roster is **unknown** — git shows one author but
  cannot confirm who is still on the project or who owns it organizationally.
- Whether any work was pair-authored with a human not recorded as git author is
  **unknown** (only the AI co-author trailer is visible).

### Commands run
- `git rev-parse --short HEAD`
- `git shortlog -sne --no-merges HEAD`
- `git log --no-merges --format="%aN" | sort | uniq -c`
- `git log --no-merges --format="%b" | grep -ci co-authored-by`
- per-capability loop: `git log --no-merges --oneline/--format=%aN/%b -- <paths>`
- `git log --no-merges --author=lukasM --format="%h %s"`
- `git log --no-merges --format="%ai" | sort` (active period)
