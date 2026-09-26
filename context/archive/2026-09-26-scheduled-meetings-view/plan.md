# Scheduled Meetings View — Implementation Plan

## Overview

Build a `/meetings` page that shows all confirmed meetings for the logged-in
user — i.e., invitations with `status = 'accepted'` where the user is either
sender or receiver. Both walk and breeding types are shown from day one, each
with a type badge, so S-08 can ship without modifying this page. No new
migration is required — the `invitations` table (S-04) already has the
`status` and `type` columns needed.

## Current State Analysis

- `invitations` table: live in Supabase with `status ∈ {pending, accepted, declined}` and `type ∈ {walk, breeding}`.
- RLS policy `invitations_select_participant` (`src/middleware.ts` referenced; migration `supabase/migrations/20260926090001_create_invitations.sql`) already allows both sender and receiver to read their rows — no new DB policy needed.
- Service layer (`src/lib/services/invitation.ts`): six functions exist; none queries accepted/confirmed meetings. A seventh function is needed.
- `/meetings` page and folder do not exist.
- `PROTECTED_ROUTES` (`src/middleware.ts:5`): `["/dashboard", "/profile", "/dogs", "/owners", "/invitations"]` — `/meetings` is missing.
- Topbar (`src/components/Topbar.astro`): nav order is Dashboard | Owners | Invitations | Profile | Dogs | Sign out. "Meetings" slot is between Invitations and Profile.

## Desired End State

- `/meetings` is accessible to logged-in users and redirects unauthenticated visitors to `/auth/signin`.
- The page lists every accepted invitation where `user.id = sender_id OR user.id = receiver_id`, ordered newest-first by `updated_at`.
- Each card shows: counterparty profile name, a type badge (`Walk` or `Breeding`), and the date the invitation was accepted.
- Empty state: "No confirmed meetings yet. Browse owners →".
- Topbar: Dashboard | Owners | Invitations | **Meetings** | Profile | Dogs | Sign out.

### Key Discoveries

- `src/lib/services/invitation.ts:63-89` — `listReceivedPending` / `listSentPending` are the direct model for the new `listAcceptedMeetings` function; the OR-filter pattern is the only structural difference.
- `src/pages/invitations/index.astro:22-37` — two-query join pattern: collect unique counterparty IDs into a `Set`, then batch-fetch profiles with `Promise.all([...ids].map(id => getProfile(supabase, id)))`. Reuse verbatim for meetings page.
- Counterparty ID derivation: for a given meeting, `counterpartyId = inv.senderId === user.id ? inv.receiverId : inv.senderId` (unlike the invitations inbox which handles received/sent separately).
- `updated_at` stores the timestamp of the last status change — for `status = 'accepted'` rows this is the acceptance date.

## What We're NOT Doing

- No meeting cancellation — PRD state machine is `pending → accepted | declined`; no cancel state in S-05.
- No date/time scheduling — `invitations` has no date/time field; logistics coordination is OQ-002 (potential future chat feature).
- No dog profile info on the card — dog names are a possible later enhancement.
- No filter/sort UI — single list ordered by `updated_at DESC`.
- Breeding meetings won't be created until S-08, but the page already handles `type='breeding'` so it shows correctly without code changes.

## Implementation Approach

Two sequential phases: service function first (independently verifiable via import), then the UI. Phase 2 touches three files (page, middleware, Topbar) but all changes are small and all test against the same lint + build gate.

---

## Phase 1: Service Function

### Overview

Add `listAcceptedMeetings` to the invitation service. The function queries all
accepted invitations where the current user is either participant, ordered by
acceptance date descending.

### Changes Required

#### 1. listAcceptedMeetings

**File**: `src/lib/services/invitation.ts`

**Intent**: Expose a query for the confirmed-meetings view. Follows the same
structure as `listReceivedPending` / `listSentPending` but uses an OR filter on
both sender and receiver columns and filters on `status = 'accepted'`.

**Contract**: `listAcceptedMeetings(client: SupabaseClient, userId: string): Promise<Invitation[]>` — selects all columns from `invitations` where `(sender_id = userId OR receiver_id = userId) AND status = 'accepted'`, ordered by `updated_at` descending. Returns mapped `Invitation[]`. Throws on Supabase error. The `.or()` call syntax: `.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- `listAcceptedMeetings` is importable from the meetings page with no TypeScript errors at the call site

**Implementation Note**: Confirm before proceeding to Phase 2.

---

## Phase 2: /meetings Page, Nav Link, Protected Route

### Overview

Create the meetings page, guard the route, and insert the Topbar link. The page
uses the two-query join pattern from the invitations inbox to resolve counterparty
names without a PostgREST join on `auth.users`.

### Changes Required

#### 1. /meetings page

**File**: `src/pages/meetings/index.astro` (new file)

**Intent**: Read-only list of confirmed meetings for the logged-in user. Each
card identifies the counterparty and distinguishes walk from breeding meetings.

**Contract**:
- Imports `listAcceptedMeetings` from `@/lib/services/invitation`, `getProfile` from `@/lib/services/profile`, and `createClient` from `@/lib/supabase`.
- Calls `listAcceptedMeetings(supabase, user.id)`.
- Derives `counterpartyId` per meeting: `inv.senderId === user.id ? inv.receiverId : inv.senderId`.
- Collects unique counterparty IDs into a `Set<string>`; batch-fetches with `Promise.all([...ids].map(id => getProfile(supabase, id)))` into a `Map<string, Profile | null>`.
- Each card renders: `profile.name ?? "Unknown"`, type badge (`Walk` when `inv.type === "walk"`, `Breeding` otherwise), `new Date(inv.updatedAt).toLocaleDateString()`.
- Empty state (no meetings): "No confirmed meetings yet." with a link to `/owners`.
- Page title: "Meetings".

#### 2. PROTECTED_ROUTES

**File**: `src/middleware.ts`

**Intent**: Guard `/meetings` so unauthenticated users are redirected to `/auth/signin`.

**Contract**: Append `"/meetings"` to the `PROTECTED_ROUTES` array at line 5.

#### 3. Topbar Meetings link

**File**: `src/components/Topbar.astro`

**Intent**: Add "Meetings" as a nav link in the authenticated menu, between Invitations and Profile.

**Contract**: Insert `<a href="/meetings" …>Meetings</a>` after the Invitations link and before the Profile link. Use the same class string as adjacent links (`text-purple-300 transition-colors hover:text-purple-100 hover:underline`).

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- `/meetings` renders a list (or empty state) for the logged-in user
- Each confirmed meeting card shows counterparty name, type badge (Walk/Breeding), and accepted date
- Empty state shows "No confirmed meetings yet. Browse owners →" when no accepted meetings exist
- `/meetings` while logged out redirects to `/auth/signin`
- Topbar shows "Meetings" between "Invitations" and "Profile"

---

## Testing Strategy

### Manual Testing Steps

1. Log in as user A; visit `/meetings` — confirm empty state with "Browse owners →" link
2. Have user A send a walk invitation to user B; user B accepts — confirm `/meetings` for both A and B now shows one Walk card with the other's name and today's date
3. Confirm the Walk badge renders correctly and the accepted date is correct
4. Log out; visit `/meetings` directly — confirm redirect to `/auth/signin`
5. (Post S-08) Confirm a breeding invitation appears as a Breeding badge in the same list

## References

- Roadmap: `context/foundation/roadmap.md` (S-05)
- PRD: `context/foundation/prd.md` (FR-007, US-01)
- Invitation service: `src/lib/services/invitation.ts`
- Invitations migration: `supabase/migrations/20260926090001_create_invitations.sql`
- Two-query join pattern: `src/pages/invitations/index.astro:22-37`
- Service pattern: `src/lib/services/invitation.ts:63-89` (listReceivedPending / listSentPending)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Service Function

#### Automated

- [x] 1.1 npm run lint passes — f46ca16
- [x] 1.2 npm run build passes — f46ca16

#### Manual

- [x] 1.3 listAcceptedMeetings importable with no TypeScript errors — f46ca16

### Phase 2: /meetings Page, Nav Link, Protected Route

#### Automated

- [x] 2.1 npm run lint passes — 42abfbc
- [x] 2.2 npm run build passes — 42abfbc

#### Manual

- [x] 2.3 /meetings shows confirmed meeting cards with name, type badge, and date — 42abfbc
- [x] 2.4 Empty state shown when no accepted meetings — 42abfbc
- [x] 2.5 Type badge shows Walk or Breeding correctly — 42abfbc
- [x] 2.6 /meetings while logged out redirects to /auth/signin — 42abfbc
- [x] 2.7 Topbar shows Meetings between Invitations and Profile — 42abfbc
