<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Meeting Form (ui-meeting-form)

- **Plan**: context/changes/ui-meeting-form/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-09-30
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — dog_id ownership not verified (IDOR)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/invitations/index.ts:50-53, src/lib/services/invitation.ts:31-55
- **Detail**: The API validates `dog_id` is a UUID but never verifies the dog belongs to `user.id`. The FK `REFERENCES dogs(id)` only guarantees existence; RLS `invitations_insert_own` only checks `sender_id = auth.uid()`. An authenticated user can POST any existing dog's UUID (dog UUIDs are exposed in `/owners/[id]` markup) and attribute someone else's dog to their invitation. UI only offers own dogs, but the endpoint is the trust boundary. Acceptable for MVP is a product call — but should be conscious.
- **Fix**: In `sendInvitation`, when `dogId` is present, fetch the dog and assert `dog.ownerId === senderId`, else throw a validation error. Mirrors the ownership pattern used elsewhere.
  - Strength: Closes the IDOR at the service boundary; cheap, localized.
  - Tradeoff: One extra DB read on invitations that attach a dog.
  - Confidence: HIGH — `getDog`/ownership check pattern exists in the repo.
  - Blind spot: Doesn't add cross-field rule (breeding requires dog / walk forbids) — separate concern.
- **Decision**: FIXED — ownership guard added to sendInvitation (getDog + ownerId check)

### F2 — scheduled_at: schema optional vs UI required, no date validation

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/invitations/index.ts:12, src/components/meetings/MeetingForm.tsx:109
- **Detail**: `scheduled_at: z.string().nullish()` accepts any string and is optional, while the form marks the field `required` (client-side only). A direct POST omitting it succeeds and stores NULL, contradicting the UI contract; a parseable-but-nonsense or past datetime is stored silently. `dogs/index.ts` validates birthdate is a real, non-future date — this endpoint has no equivalent.
- **Fix**: Tighten the zod schema — make `scheduled_at` required (drop `.nullish()`), validate it parses to a valid `Date`, optionally reject past datetimes. Follow the `dogSchema.birthdate` refinement.
  - Strength: Server enforces the UI's stated contract; prevents silent bad data.
  - Tradeoff: Slightly more schema code; must decide if past dates are allowed.
  - Confidence: HIGH — refinement pattern already in repo.
  - Blind spot: Whether product wants to allow past-dated meetings (backfill).
- **Decision**: FIXED — scheduled_at now required + valid + not-in-past; validation/catch errors redirect back to /meetings/new so the form shows them

### F3 — dead "sent=1" success banner in owners page

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/pages/owners/[id].astro:94-98
- **Detail**: The `sent === "1"` banner ("Walk invitation sent!") is now unreachable — the API redirects to `/meetings` instead of `/owners/{id}?sent=1`. Harmless leftover, but dead code.
- **Fix**: Remove the `sent === "1"` banner block (and the `const sent = ...` read) from `/owners/[id].astro`.
- **Decision**: FIXED — removed dead banner + `const sent`

### F4 — unused `name` prop in MeetingForm

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/meetings/MeetingForm.tsx:9-13
- **Detail**: `receiver.name` is accepted in props but unused — the heading is rendered by the page (`new.astro`). Not a bug; slightly misleading prop surface.
- **Fix**: Either drop `name` from the props type, or use it (e.g. render it in the form header). Low priority.
- **Decision**: FIXED — dropped `name` from props + new.astro mount

### F5 — sendInvitation growing positional params

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/lib/services/invitation.ts:31-38
- **Detail**: `sendInvitation` now has 6 positional params (2 optional), easy to misorder. Other service mutators (`createDog`, `upsertProfile`) take a typed input object. The breeding flow (S-08) will add more fields.
- **Fix**: Consider an `InvitationInput` object for parity — best done when S-08 extends this. Low priority now.
- **Decision**: SKIPPED — defer to S-08 (breeding-inquiry-loop) when the signature grows
