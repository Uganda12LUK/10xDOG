<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Walk Invitation Loop

- **Plan**: context/changes/walk-invitation-loop/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-09-26
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — respondToInvitation ignores userId — no app-layer receiver guard

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/invitation.ts:118–133
- **Detail**: `respondToInvitation` accepts `userId` but explicitly discards it (`const _ = userId`), relying solely on RLS to enforce that only the receiver can update. If RLS is ever misconfigured or a policy changes, the service will silently update any row matching only on `id`. The caller passes `user.id` expecting it to scope the operation.
- **Fix**: Add `.eq("receiver_id", userId)` to the update chain as a defense-in-depth guard. Removes the `const _ = userId` suppression comment and makes intent self-documenting.
  - Strength: Free safeguard; pattern already used in `listReceivedPending`/`listSentPending`.
  - Tradeoff: None — the RLS still enforces the same rule; this is additive.
  - Confidence: HIGH — identical defense-in-depth pattern recommended in Supabase docs.
  - Blind spot: None significant.
- **Decision**: FIXED (added `.eq("receiver_id", userId)` to update chain in `src/lib/services/invitation.ts`)

### F2 — params.id not UUID-validated in respond endpoint

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/invitations/[id].ts:13
- **Detail**: `context.params.id` is used directly as a Supabase row ID without UUID validation. A malformed string causes a Postgres error whose message is exposed to the user via the redirect `?error=` parameter.
- **Fix**: Add `if (!id || !z.string().uuid().safeParse(id).success) return context.redirect("/invitations");` before the auth/service calls. `z` is already imported.
- **Decision**: FIXED (added UUID safeParse guard in `src/pages/api/invitations/[id].ts:14`)

### F3 — N+1 profile queries in invitations inbox

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/invitations/index.astro:32–37
- **Detail**: Profile lookup for counterparties fires N concurrent `getProfile()` calls via `Promise.all` — one DB round-trip per unique counterparty. With many pending invitations this fans out against the database.
- **Fix A ⭐ Recommended**: Add `listProfilesByIds(client, ids[])` to the profile service using `.in("id", ids)` — fetch all counterparties in a single query.
  - Strength: Eliminates fan-out; same pattern can be reused by the meetings page.
  - Tradeoff: One new service function to write and test.
  - Confidence: HIGH — `.in()` pattern is standard Supabase SDK.
  - Blind spot: None significant.
- **Fix B**: Leave as-is with a TODO comment; acceptable for MVP with few users.
  - Strength: Zero code change now.
  - Tradeoff: Accumulates as user count grows; harder to fix later under load.
  - Confidence: MED — depends on expected invitation volume.
  - Blind spot: Current seed has 2 users — issue invisible in dev.
- **Decision**: FIXED (added `listProfilesByIds` to `src/lib/services/profile.ts` + updated `src/pages/invitations/index.astro` to use batch fetch)

### F4 — listAcceptedMeetings uses string interpolation in .or() filter

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/invitation.ts:108
- **Detail**: `.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)` — string interpolation into PostgREST filter syntax. Currently called only with `user.id` from a verified session (safe), but the pattern is fragile — if ever called with an untrusted value it becomes an injection vector.
- **Fix**: Add a UUID guard at the top of the function: `z.string().uuid().parse(userId)` (throw on invalid). Makes the safe assumption explicit.
- **Decision**: FIXED (added `z.string().uuid().parse(userId)` guard in `src/lib/services/invitation.ts:106`)

### F5 — listAcceptedMeetings added out of scope

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/services/invitation.ts:104–116
- **Detail**: `listAcceptedMeetings` is exported from the invitation service but was not in the S-04 plan. It was added as forward-scaffolding for S-05, which is now completed. Since S-05 is archived, this extra function is now in production — the scope creep already paid off, but the plan was never updated to reflect it.
- **Fix**: No code change needed. Document this as accepted scope creep (S-04 pre-scaffolded S-05 service layer).
- **Decision**: SKIPPED (S-05 is complete; `listAcceptedMeetings` is in use and correct — documented as intentional forward-scaffolding)

### F6 — Meetings nav link added outside S-04 plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/Topbar.astro:30–32
- **Detail**: A `<a href="/meetings">Meetings</a>` link was added to Topbar during S-04's implementation. S-04's plan covers only the Invitations link. The Meetings link belongs to S-05 scope. Since S-05 is now complete and archived this is already resolved, but it wasn't documented as intentional cross-phase scaffolding.
- **Fix**: Accept — S-05 is shipped and the link is correct. Document as intentional cross-phase scaffolding.
- **Decision**: ACCEPTED-AS-RULE (S-05 shipped; Meetings link correct; FORWARD annotation added to plan.md; rule saved to context/foundation/lessons.md)

### F7 — formData() called before supabase check

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/invitations/index.ts:14
- **Detail**: `formData()` is called before the `supabase` null-check (line 17). In `src/pages/api/dogs/[id].ts` the pattern is the reverse: check supabase first, then parse form data. The current order is intentional (need `rawReceiverId` for the redirect URL), but departs from the established pattern without a comment explaining why.
- **Fix**: Add a one-line comment explaining why formData must precede the supabase check (needed for error redirect URL construction). No code change required.
- **Decision**: FIXED (added one-line comment in `src/pages/api/invitations/index.ts:14` explaining ordering)

### F8 — Raw Supabase/DB error messages exposed to users

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/owners/[id].astro:101–105, src/pages/invitations/index.astro:61–62
- **Detail**: `{error}` is rendered from a redirect query parameter populated with raw error messages from API routes. Astro escapes values so no XSS risk, but Postgres constraint violation messages (e.g., index names, column names) leak schema details. Affects both `/owners/[id]` and `/invitations`.
- **Fix**: Map known error conditions to user-friendly messages in the API routes before encoding into redirect URLs (e.g., `"Something went wrong. Please try again."`).
- **Decision**: FIXED (replaced raw `error.message` with generic string in `src/pages/api/invitations/index.ts:47` and `src/pages/api/invitations/[id].ts:44`)

### F9 — RLS UPDATE policy doesn't restrict which fields can be changed

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260926090001_create_invitations.sql:49–55
- **Detail**: `invitations_update_receiver` enforces `receiver_id = auth.uid()` but doesn't restrict which columns the receiver can mutate. A raw Supabase client call could update `sender_id`, `receiver_id`, `type`, or `created_at`.
- **Fix**: Add a migration that restricts the UPDATE policy via a `WITH CHECK` pinning `status IN ('accepted', 'declined')` and ensuring other columns stay unchanged, or add a trigger that rejects column changes outside of `status`.
- **Decision**: FIXED (added migration `20260926090002_restrict_invitation_status_update.sql` with BEFORE UPDATE trigger that rejects changes to immutable columns and restricts status to accepted/declined)
