<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Replace hardcoded colors in /meetings with semantic design tokens

- **Plan**: context/changes/meetings-ui-tokens/plan.md
- **Scope**: Full plan (Phase 1 + Phase 2)
- **Reviewed phases**: 1, 2
- **Date**: 2026-09-26
- **Verdict**: APPROVED (after triage)
- **Findings**: 0 critical, 2 warnings, 2 observations

## Visual Gate

Screenshots captured at DoD gate:

- `context/changes/meetings-ui-tokens/screenshot-desktop.png` — 1280×800, all states (empty / list / error note / loading note)
- `context/changes/meetings-ui-tokens/screenshot-mobile.png` — 390×844

States verified:
- ✅ Empty state — `bg-card border-border text-muted-foreground`, coral `text-primary` link
- ✅ List state — meeting cards with `bg-card`, `bg-accent` badge (peach/coral), `text-muted-foreground` date
- ⚠️ Error state — no custom error UI; DB throw → naked 500 (see F3)
- ℹ️ Loading state — SSR page, no client-side loading skeleton; not applicable

Note: Screenshots reflect the **working tree** state (devserver serves working tree). The committed HEAD still has raw color values fixed in the working tree (see F1).

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Two raw color values leaked through Phase 2

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/pages/meetings/index.astro` (committed HEAD)
- **Detail**: Two raw Tailwind palette classes were not migrated and not in the "intentionally kept" list:
  1. `text-white` on the outer wrapper `<div class="w-full max-w-lg text-white">` — stale holdover, not listed as a charge target nor as intentionally kept
  2. `text-blue-100/80` on the empty-state container `<div class="... text-blue-100/80 ...">` — charge #4 only migrated the link color `text-purple-300`; the surrounding prose color was missed
  The working tree already fixes both (`text-white` removed, `text-blue-100/80` → `text-muted-foreground`).
- **Fix**: Commit the working tree cleanup of `src/pages/meetings/index.astro` — the fixes already exist, they just need to be committed under this change or a follow-on.
- **Decision**: FIXED

### F2 — `--primary` recalibrated twice; Phase 2 silently superseded Phase 1's stated value

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline / Plan Adherence
- **Location**: `src/styles/global.css` (Phase 2 commit `0c1284f`)
- **Detail**: Phase 1 calibrated `--primary` to purple `oklch(0.558 0.288 301)` and Phase 1 manual criterion 1.3 records "Button renders purple ✅". Phase 2 commit immediately changed `--primary` to amber `oklch(0.75 0.18 65)` — documented in the commit message but absent from plan.md Phase 2 (whose scope was "view migration only"). The plan's source of truth says purple; deployed HEAD is amber. The working tree has since made a third change (full "Koralowa smycz" coral redesign, also uncommitted).
- **Fix A ⭐ Recommended**: Add a brief addendum to plan.md Phase 2 recording the amber re-decision and update the manual criterion to reflect amber, not purple. The commit message has the decision; this brings the plan doc in sync.
  - Strength: Plan becomes the single source of truth; future reviewers can follow the reasoning without reading git log.
  - Tradeoff: Minor — small plan edit.
  - Confidence: HIGH — the working tree's "Koralowa smycz" already supersedes amber, so this is purely a traceability fix.
  - Blind spot: None significant.
- **Fix B**: Leave plan as-is; treat working tree "Koralowa smycz" redesign as the canonical replacement and archive this change once that new change lands.
  - Strength: Less editorial work now.
  - Tradeoff: Plan stays inconsistent with reality; anyone reviewing the archived plan sees a misleading purple success criterion.
  - Confidence: MEDIUM.
  - Blind spot: Timeline unclear — if "Koralowa smycz" change stalls, the gap persists indefinitely.
- **Decision**: FIXED

### F3 — No error handling at DB boundary

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/meetings/index.astro:16-27`
- **Detail**: Neither `listAcceptedMeetings` nor `listProfilesByIds` is wrapped in try/catch. An uncaught throw produces a naked 500 with no user-facing error message. This is consistent with `invitations/index.astro` (same pattern there) — not a regression introduced by this change.
- **Fix**: Wrap both calls in try/catch; on error set `meetings = []` and expose an `errorMsg` string to the template.
- **Decision**: FIXED

### F4 — Uncommitted "Koralowa smycz" design system rewrite needs its own change entry

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: `src/styles/global.css`, `src/pages/meetings/index.astro` (working tree, uncommitted)
- **Detail**: The working tree contains two uncommitted diffs that go well beyond the meetings-ui-tokens scope:
  1. `src/styles/global.css`: complete design system rewrite — "Koralowa smycz" (coral leash) theme with `--primary: #C4461F`, full hex palette, new semantic role comments, additional tokens (`--success`, `--warning`, `--destructive-foreground`).
  2. `src/pages/meetings/index.astro`: additional cleanup — glassmorphism removed (`bg-white/10 backdrop-blur-xl` → `bg-card`), title changed to `text-foreground`, badge changed to `bg-accent text-accent-foreground`.
  These are improvements but they are sitting in the working tree with no change entry and no plan.
- **Fix**: Create a new change (`ui-tokens-coral` or similar), write its change.md, and commit the working tree changes under it so they are tracked and reviewed.
- **Decision**: FIXED
