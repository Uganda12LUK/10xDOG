# Scheduled Meetings View — Plan Brief

> Full plan: `context/changes/scheduled-meetings-view/plan.md`

## What & Why

Build the `/meetings` page that closes the north-star loop from S-04: a user
who confirmed a walk invitation can now see it as a confirmed meeting. FR-007
requires this view; US-01's acceptance criteria state that a meeting appears
"only after mutual confirmation" — this page is that proof.

## Starting Point

The `invitations` table (S-04) is live with `status ∈ {pending, accepted,
declined}` and `type ∈ {walk, breeding}`. The RLS `invitations_select_participant`
policy already allows both sender and receiver to read their rows. No service
function for accepted meetings exists yet, and `/meetings` is a blank canvas.

## Desired End State

A logged-in user can visit `/meetings` and see every invitation they sent or
received that was accepted — each card showing the counterparty's name, a
Walk or Breeding type badge, and the date the invitation was confirmed. The
Topbar gains a "Meetings" link between Invitations and Profile. The route is
auth-guarded.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Types shown | All accepted (walk + breeding) | S-08 ships without modifying this page; the `type` column is already there |
| Card content | Name + type badge + accepted date | Enough context to identify the meeting; minimal extra queries |
| Nav placement | After Invitations | Mirrors the cause→effect funnel: invitation comes first, meeting is its outcome |
| Cancellation | Out of scope | PRD state machine has no cancel state in S-05 |

## Scope

**In scope:**
- `listAcceptedMeetings` service function (OR-filter, both participant columns, status='accepted')
- `src/pages/meetings/index.astro` — read-only list with two-query join for counterparty names
- `/meetings` added to `PROTECTED_ROUTES`
- Topbar "Meetings" link between Invitations and Profile

**Out of scope:**
- Meeting cancellation
- Date/time scheduling (no column in schema; OQ-002)
- Dog profile info on cards
- Filter or sort UI
- Breeding meetings (S-08 creates them; this page will show them when they exist)

## Architecture / Approach

Thin read layer over the existing `invitations` table. A new `listAcceptedMeetings`
service function adds an OR-participant filter + status='accepted'. The page
follows the same two-query join pattern as `/invitations`: collect unique
counterparty IDs, batch-fetch profiles with `Promise.all`. No migration, no new
API route, no form actions.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Service Function | `listAcceptedMeetings` exported from invitation service | Supabase `.or()` syntax must use PostgREST string form |
| 2. Page + Nav + Route | `/meetings` page, PROTECTED_ROUTES, Topbar link | Counterparty ID derivation (sender vs receiver) must handle both directions |

**Prerequisites:** S-04 (walk-invitation-loop) fully deployed — `invitations` table live with accepted rows queryable via RLS.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- The `.or()` filter requires PostgREST string syntax (`.or('sender_id.eq.uuid,receiver_id.eq.uuid')`); a plain chained `.eq()` would AND the conditions and return no rows.
- Until S-08 ships and breeding invitations exist, only Walk cards will appear — the Breeding badge is correct but untestable in production until S-08.

## Success Criteria (Summary)

- A confirmed walk invitation appears as a card on `/meetings` for both the sender and the receiver.
- Unconfirmed (pending) and declined invitations do not appear.
- `/meetings` while logged out redirects to `/auth/signin`.
