# Walk Invitation Loop — Implementation Plan

## Overview

Build the S-04 north star flow: a logged-in owner sends a walk invitation
from `/owners/[id]`, the receiver sees it in a new `/invitations` inbox and
accepts or declines. The `invitations` table uses a `type` column
('walk'|'breeding') so S-08 can reuse the same table and API without
migration changes.

## Current State Analysis

- `src/pages/owners/[id].astro:87-93` has a disabled stub button with
  comment `{/* S-04: wire invitation API here */}` — the anchor is already in
  place.
- No `invitations` table, service, or API routes exist.
- Existing API pattern: `export const POST: APIRoute`, `formData()`,
  zod validation, `redirectError()` helper, redirect on success.
  See `src/pages/api/dogs/[id].ts` for the `_action` dispatch pattern.
- RLS naming convention: `<table>_<verb>_<scope>` (e.g.
  `dogs_select_authenticated`, `dogs_update_own`). See
  `docs/reference/contract-surfaces.md`.
- `set_updated_at()` trigger function already exists in the DB (created in
  the profiles migration) — reuse it; do not redefine.
- `PROTECTED_ROUTES` in `src/middleware.ts:5` currently:
  `["/dashboard", "/profile", "/dogs", "/owners"]`.

## Desired End State

- `/owners/[id]` shows an active "Send walk invitation" button when no
  pending invitation exists, and a disabled "Invitation sent — awaiting
  response" button when one does.
- Submitting the form creates a `pending` row in `invitations` and redirects
  back with `?sent=1`.
- `/invitations` shows two sections: incoming pending (with Accept / Decline
  buttons) and outgoing pending (status: awaiting). Auth-gated.
- Accepting/declining updates the row status and redirects to
  `/invitations?saved=1`.
- `Topbar.astro` shows "Invitations (N)" when N > 0 pending received.

### Key Discoveries

- `sender_id` / `receiver_id` reference `auth.users.id`, not `profiles.id`
  — same pattern as `dogs.owner_id`. No automatic PostgREST join; profile
  names fetched via a second query in the page (as in `listOwners`).
- `set_updated_at()` is already defined — the migration must NOT redefine it,
  only attach the trigger.
- The partial unique index `(sender_id, receiver_id, type) WHERE status =
  'pending'` is the DB-level duplicate guard; the UI disabled-button check is
  the UX layer on top.
- Topbar runs on every page (via Layout) — badge count uses a lightweight
  `SELECT count(*) … head: true` query inside `Topbar.astro` frontmatter to
  avoid polluting middleware locals.

## What We're NOT Doing

- Cancellation by sender — PRD state machine is `pending → accepted |
  declined` only; no 'cancelled' state in S-04.
- Accepted/declined history view — that's S-05 (scheduled-meetings-view).
- Real-time push notifications — SSR page refresh is the update mechanism.
- Breeding invitations — `type='breeding'` column is scaffolded now but the
  send-breeding flow is S-08.
- FR-008 filters on invitation matching.

## Implementation Approach

Four sequential phases: migration first (DB contract), then service layer
(data access), then API routes (HTTP contract), then UI (user-visible
surface). Each phase is independently verifiable before the next begins.

---

## Phase 1: Migration

### Overview

Create the `invitations` table with state-machine columns, self-join guard,
partial unique index, and RLS policies. No application code changes.

### Changes Required

#### 1. invitations migration

**File**: `supabase/migrations/20260926090001_create_invitations.sql`

**Intent**: Define the invitations table and its access rules. The `type`
column ('walk'|'breeding') makes this table reusable by S-08 without schema
changes. The partial unique index enforces one pending invitation per
(sender, receiver, type) at the DB level.

**Contract**: Table columns: `id uuid PK default gen_random_uuid()`,
`sender_id uuid NOT NULL FK auth.users ON DELETE CASCADE`,
`receiver_id uuid NOT NULL FK auth.users ON DELETE CASCADE`,
`type text NOT NULL CHECK (type IN ('walk','breeding'))`,
`status text NOT NULL DEFAULT 'pending' CHECK (status IN
('pending','accepted','declined'))`,
`created_at / updated_at timestamptz`.

Constraints and indexes:
- `CHECK (sender_id <> receiver_id)` — no self-invitation at DB level
- `UNIQUE INDEX (sender_id, receiver_id, type) WHERE status = 'pending'`
- Standard indexes on `sender_id`, `receiver_id`
- Trigger: `invitations_set_updated_at` reusing existing `set_updated_at()`

RLS (enable RLS, then four policies):
- `invitations_select_participant` FOR SELECT: `sender_id = auth.uid() OR receiver_id = auth.uid()`
- `invitations_insert_own` FOR INSERT: `WITH CHECK (sender_id = auth.uid())`
- `invitations_update_receiver` FOR UPDATE: `USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid())`

### Success Criteria

#### Automated Verification

- `npm run lint` passes (no application code changed)
- `npm run build` passes (no application code changed)

#### Manual Verification

- Migration SQL applied in Supabase SQL editor (or local `npx supabase db push`) without errors
- `invitations` table visible in Supabase dashboard with correct columns and policies

**Implementation Note**: After Phase 1, confirm before proceeding to Phase 2.

---

## Phase 2: Types and Service Layer

### Overview

Add the `Invitation` type and create `src/lib/services/invitation.ts` with
all data-access functions the API routes and pages will use.

### Changes Required

#### 1. Invitation type

**File**: `src/types.ts`

**Intent**: Add the `Invitation` entity type after `OwnerWithDogs` (line ~34).

**Contract**:
```ts
export interface Invitation {
  id: string;
  senderId: string;
  receiverId: string;
  type: 'walk' | 'breeding';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}
```

#### 2. Invitation service

**File**: `src/lib/services/invitation.ts` (new file)

**Intent**: Encapsulate all Supabase queries for invitations. Follow the
same patterns as `dog.ts` and `profile.ts`: private `InvitationRow`
interface, private `mapRow`, exported async functions that throw on error.

**Contract**: Export these functions:

- `sendInvitation(client, senderId, receiverId, type): Promise<Invitation>`
  — inserts a row; the DB partial unique index rejects a duplicate pending.

- `hasPendingInvitation(client, senderId, receiverId): Promise<boolean>`
  — `SELECT id … eq('sender_id', senderId).eq('receiver_id', receiverId).eq('status','pending').maybeSingle()`; returns `!!data`.

- `listReceivedPending(client, userId): Promise<Invitation[]>`
  — `eq('receiver_id', userId).eq('status','pending')`.

- `listSentPending(client, userId): Promise<Invitation[]>`
  — `eq('sender_id', userId).eq('status','pending')`.

- `countReceivedPending(client, userId): Promise<number>`
  — `select('id', { count: 'exact', head: true }).eq('receiver_id', userId).eq('status','pending')`; returns `count ?? 0`. Used by Topbar badge.

- `respondToInvitation(client, userId, invitationId, response): Promise<Invitation>`
  — `update({ status: response }).eq('id', invitationId)`; RLS ensures only the receiver can execute this.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes (TypeScript must resolve Invitation type at all call sites)

#### Manual Verification

- All six functions importable with no TS errors at call sites

**Implementation Note**: After Phase 2, confirm before proceeding to Phase 3.

---

## Phase 3: API Routes

### Overview

Add two POST-only API endpoints: one to send an invitation, one to respond.
Both follow the existing `formData` + zod + redirect pattern.

### Changes Required

#### 1. Send invitation endpoint

**File**: `src/pages/api/invitations/index.ts`

**Intent**: Receive `receiver_id` and `type` from the form on `/owners/[id]`,
validate, call `sendInvitation`, redirect back to the owner's page.

**Contract**: `export const prerender = false; export const POST: APIRoute`.
Zod schema: `{ receiver_id: z.string().uuid(), type: z.enum(['walk','breeding']) }`.
On success: `context.redirect('/owners/' + receiver_id + '?sent=1')`.
On error: `context.redirect('/owners/' + receiver_id + '?error=...')`.

#### 2. Respond to invitation endpoint

**File**: `src/pages/api/invitations/[id].ts`

**Intent**: Receive `_action` ('accept'|'decline') from the inbox form,
validate, call `respondToInvitation`, redirect to inbox.

**Contract**: `export const prerender = false; export const POST: APIRoute`.
Extract `id` from `context.params.id`. Zod: `{ _action: z.enum(['accept','decline']) }`.
Map 'accept' → 'accepted', 'decline' → 'declined'.
On success: `context.redirect('/invitations?saved=1')`.
On error: `context.redirect('/invitations?error=...')`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- POST to `/api/invitations` with valid `receiver_id` + `type` creates a row in Supabase `invitations` table
- POST to `/api/invitations/[id]` with `_action=accept` updates `status` to `accepted`
- POST to `/api/invitations/[id]` with `_action=decline` updates `status` to `declined`
- Invalid `receiver_id` (non-UUID) returns redirect with `?error=`

**Implementation Note**: After Phase 3, confirm before proceeding to Phase 4.

---

## Phase 4: UI and Navigation

### Overview

Wire the existing stub button, build the `/invitations` inbox page, guard the
route, and add the Topbar badge link.

### Changes Required

#### 1. Wire /owners/[id] button

**File**: `src/pages/owners/[id].astro`

**Intent**: Replace the disabled stub with conditional logic: if
`hasPendingInvitation` is true, show a disabled "Invitation sent — awaiting
response" button; otherwise show a `<form method="POST" action="/api/invitations">` with the active button. Add `?sent=1` banner display.

**Contract**: In frontmatter, after fetching `ownerProfile`, call
`hasPendingInvitation(supabase, user.id, ownerId)`. Pass result to template.
Form must include hidden fields `receiver_id={ownerId}` and `type="walk"`.
Active button class: same purple gradient used elsewhere in the codebase.
Disabled button class: existing `opacity-50 cursor-not-allowed`.

#### 2. /invitations inbox page

**File**: `src/pages/invitations/index.astro` (new file)

**Intent**: Show two sections — "Incoming" (pending received, with
Accept/Decline buttons per invitation) and "Outgoing" (pending sent, status
only). Fetch invitations, then fetch profiles for all unique counterparty IDs
in a second query (two-query join pattern from `listOwners`).

**Contract**:
- Calls `listReceivedPending(supabase, user.id)` and `listSentPending(supabase, user.id)`.
- Second query: `getProfile` or a batch profile lookup for all unique
  sender/receiver IDs to display names.
- Accept/Decline: `<form method="POST" action="/api/invitations/{id}">` with
  `<input type="hidden" name="_action" value="accept|decline">`.
- Empty state (no pending): "No pending invitations." with link to `/owners`.
- Page title: "Invitations".

#### 3. PROTECTED_ROUTES

**File**: `src/middleware.ts`

**Intent**: Guard `/invitations` so unauthenticated users are redirected to sign-in.

**Contract**: Append `"/invitations"` to `PROTECTED_ROUTES` array at line 5.

#### 4. Topbar badge

**File**: `src/components/Topbar.astro`

**Intent**: Show "Invitations (N)" when N > 0 pending received; plain
"Invitations" when 0. Query runs only for authenticated users.

**Contract**: In Topbar frontmatter, import `createClient` and
`countReceivedPending`. When `user` is non-null, create a Supabase client and
call `countReceivedPending`. Render: `Invitations{count > 0 ? ` (${count})` : ''}`.
Insert the link between "Owners" and "Profile" in nav order:
`Dashboard | Owners | Invitations (N) | Profile | Dogs | Sign out`.

> **FORWARD (S-05)**: A "Meetings" nav link pointing to `/meetings` was also
> added to Topbar in this phase as forward-scaffolding for S-05
> (scheduled-meetings-view). The route and page for `/meetings` are implemented
> in S-05, not here.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- Active "Send walk invitation" button appears on `/owners/[id]` when no pending invitation exists
- Submitting the form creates a row in `invitations` and shows `?sent=1` banner; button becomes disabled "Invitation sent — awaiting response"
- `/invitations` shows incoming pending invitation with Accept/Decline buttons
- Clicking Accept updates status to 'accepted'; invitation disappears from inbox
- Clicking Decline updates status to 'declined'; invitation disappears from inbox
- Topbar badge shows "Invitations (1)" when one pending received; badge absent when none
- Visiting `/invitations` while logged out redirects to `/auth/signin`

---

## Testing Strategy

### Manual Testing Steps

1. Log in as user A; visit `/owners/{user-B-id}` — confirm active button
2. Send invitation — confirm badge "(1)" appears in B's Topbar
3. Log in as user B; visit `/invitations` — confirm invitation appears with Accept/Decline
4. Accept — confirm badge disappears; visit `/owners/{user-A-id}` as A — button now disabled (invitation accepted, not pending)
5. Log in as user A; send another invitation to user B (status accepted, not pending) — confirm button is active again (no pending for this pair)
6. Decline scenario: repeat steps 1-3, Decline instead — same inbox cleanup
7. Log out; visit `/invitations` directly — confirm redirect to `/auth/signin`

## References

- Roadmap: `context/foundation/roadmap.md` (S-04)
- PRD: `context/foundation/prd.md` (FR-005, FR-006, US-01, Business Logic)
- Contract surfaces: `docs/reference/contract-surfaces.md`
- Invitation button stub: `src/pages/owners/[id].astro:87`
- API pattern reference: `src/pages/api/dogs/[id].ts`
- Service pattern reference: `src/lib/services/dog.ts`
- Two-query join pattern: `src/lib/services/profile.ts:109` (listOwners)
- Profiles migration: `supabase/migrations/20260923090001_create_profiles.sql`
- Dogs migration: `supabase/migrations/20260924090001_create_dogs.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Migration

#### Automated

- [x] 1.1 npm run lint passes — d6e6262
- [x] 1.2 npm run build passes — d6e6262

#### Manual

- [x] 1.3 Migration applied without errors in Supabase — d6e6262
- [x] 1.4 invitations table visible with correct columns and RLS policies — d6e6262

### Phase 2: Types and Service Layer

#### Automated

- [x] 2.1 npm run lint passes — fa0864b
- [x] 2.2 npm run build passes — fa0864b

#### Manual

- [x] 2.3 All six service functions importable with no TypeScript errors — fa0864b

### Phase 3: API Routes

#### Automated

- [x] 3.1 npm run lint passes — 0cd3d5c
- [x] 3.2 npm run build passes — 0cd3d5c

#### Manual

- [x] 3.3 POST /api/invitations creates row in invitations table — 0cd3d5c
- [x] 3.4 POST /api/invitations/[id] with _action=accept updates status to accepted — 0cd3d5c
- [x] 3.5 POST /api/invitations/[id] with _action=decline updates status to declined — 0cd3d5c
- [x] 3.6 Invalid receiver_id returns redirect with ?error= — 0cd3d5c

### Phase 4: UI and Navigation

#### Automated

- [x] 4.1 npm run lint passes — fc8d9bc
- [x] 4.2 npm run build passes — fc8d9bc

#### Manual

- [x] 4.3 Active Send button on /owners/[id] when no pending invitation — fc8d9bc
- [x] 4.4 Button becomes disabled after sending; ?sent=1 banner shown — fc8d9bc
- [x] 4.5 /invitations inbox shows incoming pending with Accept/Decline buttons — fc8d9bc
- [x] 4.6 Accept removes invitation from inbox — fc8d9bc
- [x] 4.7 Decline removes invitation from inbox — fc8d9bc
- [x] 4.8 Topbar badge shows count when pending received; absent when 0 — fc8d9bc
- [x] 4.9 /invitations while logged out redirects to /auth/signin — fc8d9bc
