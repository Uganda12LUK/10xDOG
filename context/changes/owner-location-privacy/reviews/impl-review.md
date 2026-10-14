<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Owner Location/Street Privacy

- **Plan**: context/changes/owner-location-privacy/plan.md
- **Scope**: Full plan (phases 1-3)
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Foreign profile read in /meetings/new still uses getProfile (narrow-shape invariant incomplete)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/meetings/new.astro:24
- **Detail**: `getProfile(supabase, receiverId)` reads an arbitrary foreign owner (`receiver_id` from the query string, no owner check) and pulls the full `Profile` — including `street` (district) and precise `location_lat/lng` — into SSR memory. No client leak *today*: only `receiverProfile.name` is rendered (line 61) and only `{ id, city }` is passed to the hydrated `MeetingForm` (lines 69-72). But it keeps precise coords server-side for an ungated foreign id, so a future `JSON.stringify(receiverProfile)` or an added prop would leak — the exact regression class this change set out to close. The plan/frame scoped foreign reads to `/map/[id]` + pack and missed this site; the implementation matches the plan, but the "all foreign reads go through the narrow shape" invariant has a gap here.
- **Fix**: Switch `src/pages/meetings/new.astro:24` to `getPublicProfile` (type `receiverProfile` as `PublicProfile | null`, update the import). `MeetingForm` consumes only `id`/`city` and the heading only `name` — all present on `PublicProfile`.
  - Strength: Completes the foreign-read invariant; removes precise coords from SSR for an ungated foreign id. Mirrors the Phase-2 edits exactly.
  - Tradeoff: Minor — one call site + import/type change; `listDogs(user.id)` and `getPackStatus` on the same `Promise.all` are unaffected.
  - Confidence: HIGH — identical conversion to Phase 2's map/[id] change; consumers verified to need only id/city/name.
  - Blind spot: None significant (MeetingForm props confirmed at lines 69-72).
- **Decision**: FIXED — meetings/new.astro switched to getPublicProfile (import, type, call); eslint clean.

### F2 — Foreign profile read in /messages/[id] uses getProfile (pack-gated)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/messages/[id].astro:23
- **Detail**: Also a foreign read via `getProfile`, but gated behind `isInPack` (line 22) and only `other.name` is used (lines 28/35); nothing beyond ids reaches the hydrated `ChatThread`. Lower risk than F1 because of the pack gate, but the same latent concern — full coords fetched into SSR when only the name is needed.
- **Fix**: Switch to `getPublicProfile` for consistency with the narrow-shape invariant (only `name` is used).
- **Decision**: FIXED — messages/[id].astro switched to getPublicProfile (import, type, call); eslint/build/test green (34/34).
