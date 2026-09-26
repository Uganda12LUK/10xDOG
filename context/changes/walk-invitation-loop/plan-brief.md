# Walk Invitation Loop — Plan Brief

> Full plan: `context/changes/walk-invitation-loop/plan.md`

## What & Why

Build the S-04 north star feature: owner A sends a walk invitation to owner B
from `/owners/[id]`, owner B accepts or declines from a new `/invitations`
inbox. This is the core two-sided matching loop — the most important
hypothesis in the product. Until this loop works, nothing else matters.

## Starting Point

The invitation button stub already exists at `src/pages/owners/[id].astro:87`
(disabled, with comment `/* S-04: wire invitation API here */`). No
`invitations` table, service, API routes, or inbox page exist yet.

## Desired End State

A logged-in user can send a walk invitation to another owner with one click.
The receiver sees a badge in the nav ("Invitations (1)"), opens `/invitations`,
and accepts or declines. After acceptance both parties' invitations disappear
from pending. The `invitations` table is designed so S-08 (breeding inquiry)
reuses it with `type='breeding'` — no schema changes needed later.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Inbox location | New `/invitations` page | Clean S-04/S-05 boundary; avoids dashboard bloat | Plan |
| Duplicate guard | Button disabled when pending (+ partial unique index) | UX layer + DB constraint belt-and-suspenders | Plan |
| Nav badge | Yes, count of pending received | Loop closes faster when receiver knows to check | Plan |
| Sender cancel | Not in S-04 | PRD state machine is pending→accepted/declined only | PRD |
| type column | 'walk'|'breeding' | S-08 reuses same table without migration changes | PRD Business Logic |
| Profile names in inbox | Two-query join in page frontmatter | Matches listOwners pattern; no PostgREST FK for auth.users | Code |

## Scope

**In scope:**
- `invitations` DB migration (table, RLS, partial unique index)
- `Invitation` type + full service layer (send, respond, list, count)
- `POST /api/invitations` (send) + `POST /api/invitations/[id]` (respond)
- Wire button on `/owners/[id]` (active / disabled states)
- `/invitations` inbox (incoming pending + outgoing pending)
- Topbar badge with pending count
- `/invitations` added to PROTECTED_ROUTES

**Out of scope:**
- Sender cancellation of pending invitation
- Accepted/declined history (S-05)
- Breeding invitation send flow (S-08)
- Real-time notifications
- FR-008 filters

## Architecture / Approach

SSR-only flow — no React islands needed. The send form and respond forms are
plain HTML forms posting to API routes, following the same
`formData → zod → service → redirect` pattern as all existing API routes.
The badge count query runs in `Topbar.astro` frontmatter (lightweight
`count: 'exact', head: true`), keeping middleware clean. The `invitations`
table has `sender_id` / `receiver_id` referencing `auth.users.id` (same
as `dogs.owner_id`); profile names are fetched via a second query in page
frontmatter.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Migration | `invitations` table, RLS, partial unique index | Must reuse `set_updated_at()` — not redefine it |
| 2. Types + Service | `Invitation` type + 6 service functions | hasPendingInvitation query performance |
| 3. API Routes | POST send + POST respond endpoints | _action dispatch pattern (same as dogs/[id].ts) |
| 4. UI + Navigation | Wired button, inbox page, badge | Two-query profile join; badge on every page load |

**Prerequisites:** S-03 done (owners list + /owners/[id] stub). Supabase
project accessible for manual migration.
**Estimated effort:** ~1-2 sessions across 4 phases.

## Open Risks & Assumptions

- Migration must be applied manually via Supabase SQL editor (no local Supabase in current env)
- Badge adds one Supabase count query per page load — acceptable for `users: small` scale; revisit if traffic grows
- After accepting/declining, confirmed meetings are not yet visible (S-05 builds that)

## Success Criteria (Summary)

- User A sends walk invitation to User B; button becomes disabled "Invitation sent"
- User B sees badge "(1)" in nav; opens /invitations; accepts → badge disappears
- Declining removes invitation from inbox; no meeting is created (S-05 is where accepted meetings appear)
