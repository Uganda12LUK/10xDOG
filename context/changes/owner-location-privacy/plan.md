# Owner Location/Street Privacy — Implementation Plan

## Overview

The PRD guarantees that an owner's street address and precise GPS are never visible
to other users. Two read paths violate this today: the owner-detail page renders
another owner's `street`, and the pack page ships the full foreign `Profile`
(street + exact `location_lat/lng`) into a hydrated React island. We split the
profile read into a full **self** read (unchanged) and a narrowed **public/foreign**
read that structurally cannot carry `street` or coordinates, and route every
foreign call site through it. The fix starts with a failing regression test.

## Current State Analysis

`getProfile` (src/lib/services/profile.ts:62) does `select("*")` and maps the full
row — `street` (DB `district`) + exact `locationLat/Lng` — into `Profile`. It is
**dual-use**:

- **Self reads** (legitimate full access): `/map/index.astro:21`, the `/profile`
  pages, `pack.ts` indirectly for the viewer's own anchor.
- **Foreign reads** (must be narrowed): `/map/[id].astro:24` (another owner) and
  `pack.ts:174` `hydrateMembers` (the "other party").

Leak map (verified):

- **Owner-detail** — `/map/[id].astro:24` → `getProfile(id)` for another user →
  `OwnerProfile.astro:25` renders `profile.street` **on screen**. Exact coords sit in
  the props but `OwnerProfile` is pure server-rendered Astro (not hydrated), so coords
  don't reach the client here — the street does. User-visible PRD violation.
- **Pack** — `pack.astro:26` passes `PackMember[]` (each carrying a full `Profile`)
  into `PackView` with `client:load`. A hydrated island **serializes the whole
  profile into the HTML**, shipping `street` + exact coords to the browser. Worse than
  owner-detail: it's a real client-side coordinate leak. `PackView` only reads
  `profile.avatarUrl`, `profile.name`, `profile.city` (PackView.tsx:64,66,103,105-107).

Already safe (do not touch):

- **Map pins** — `listDogsForMap` → `DogWithOwner` carries no street/coords; guarded by
  `tests/unit/locationPrivacy.test.ts`.
- **Meetings** — `meetings/index.astro:47-50` projects the profile to `{ name }` before
  passing it to the hydrated `MeetingsView`.

### Key Discoveries:

- `getProfile` is dual-use (self + foreign) — so the fix is a *second* read function,
  not a change to `getProfile` (profile.ts:62).
- No foreign consumer needs coordinates: discovery-radius scoping happens server-side
  inside `listOwners` (profile.ts:122-142) and coords are already stripped from its
  output. `OwnerProfile` and `PackView` only ever read name/city/avatar.
- `withinDiscoveryRadius` / `discoveryPosition` consume coords only within `listOwners`
  — they do not need a foreign DTO (geo.ts:58-83).
- Existing privacy-test idiom to mirror: forbidden-key regex + `JSON.stringify` secret-coordinate
  scan (locationPrivacy.test.ts:69-95).

## Desired End State

A foreign owner read returns a `PublicProfile` containing only `id`, `name`, `city`,
`avatarPath`, `avatarUrl`. The owner-detail page shows at most "City" (never a street);
the pack page's hydrated HTML contains no street and no coordinates for any member.
The viewer's own profile read/edit is unchanged. A regression test fails if any future
change re-widens the foreign read.

Verify: `npm run test` (new regression green + existing `locationPrivacy` green),
`npm run lint`, and a manual check that `/map/[id]` shows no street and that
`view-source` on `/pack` contains no coordinate or street values.

## What We're NOT Doing

- **No DB view / migration / RLS change.** Enforcement is service-layer (column
  allow-list in `select()`). RLS already restricts rows to authenticated users; adding
  a `public_profiles` view is deferred (its RLS test needs a live DB — blocked by the
  local Docker/WSL2 issue). Tracked as a possible defense-in-depth follow-up.
- **No coarse/rounded coordinates.** Foreign reads omit coordinates entirely; no
  consumer needs them. A future coarse-position feature would add a field deliberately.
- **No changes to the self read/write path** (`getProfile` full shape, `upsertProfile`,
  `ProfileForm`, `/api/profile`).
- **Not touching** the already-safe map-pin or meetings paths.
- **Not** the other four review items (pack-consent RLS, city normalization, E2E proof,
  docs) — each has its own change (see frame.md Scope Cut).

## Implementation Approach

Introduce a narrowed type + a dedicated foreign read, prove it with a failing test,
then repoint the two foreign call sites and tighten the component/type contracts so the
narrow shape is enforced by the compiler. Type-level narrowing (not a runtime flag) is
what makes a future re-leak a compile error rather than a silent regression.

## Phase 1: Narrowed public shape + foreign read seam (test-first)

### Overview

Add `PublicProfile` and `getPublicProfile`, driven by a failing regression test. No
call sites change yet.

### Changes Required:

#### 1. Regression test (write first — red)

**File**: `tests/unit/publicProfile.test.ts` (new)

**Intent**: Lock the contract that a foreign profile read exposes only coarse,
non-identifying fields. Written before the implementation so it fails first (function
absent), then goes green.

**Contract**: Feeds `getPublicProfile` a stubbed client whose `profiles` row carries
`district` + secret `location_lat/lng` (reuse the thenable stub idiom from
locationPrivacy.test.ts:47-67). Asserts: (a) returned object keys do not match
`/lat|lng|location|coord|address|street|district/i`; (b) `JSON.stringify(result)`
contains neither secret coordinate; (c) `city` and `name` are present. Mirror the two
`it` blocks in locationPrivacy.test.ts:71-95.

#### 2. `PublicProfile` type

**File**: `src/types.ts`

**Intent**: A profile shape safe to send to any authenticated viewer — the compile-time
guarantee that street/coords can't be rendered or serialized on a foreign path.

**Contract**: `export interface PublicProfile { id: string; name: string; city: string | null; avatarPath: string | null; avatarUrl: string | null; }`. Omits `street`, `locationLat`, `locationLng`, `createdAt`, `updatedAt`.

#### 3. `getPublicProfile` service function

**File**: `src/lib/services/profile.ts`

**Intent**: Foreign-safe single-profile read with an explicit column allow-list so the
private columns never leave the database layer.

**Contract**: `export async function getPublicProfile(client, userId: string): Promise<PublicProfile | null>`. Uses `.select("id, name, city, avatar_path")` (not `*`), `.eq("id", userId).maybeSingle()`. Maps via a small `mapPublicRow` (id, name, city, avatarUrl from storage) — does not reuse `mapRow` (which pulls street/coords). Same error-throw convention as `getProfile`.

### Success Criteria:

#### Automated Verification:

- New regression test is present and passes: `npm run test`
- Existing privacy test still passes: `npm run test` (`locationPrivacy`)
- Type checking passes: `npm run build` (astro check / tsc)
- Linting passes: `npm run lint`

#### Manual Verification:

- Confirm the test genuinely fails before `getPublicProfile` exists (red→green), not a tautology.

**Implementation Note**: After automated verification passes, pause for human confirmation of the red→green sequence before Phase 2.

---

## Phase 2: Route foreign call sites through the narrow shape

### Overview

Repoint owner-detail and pack to `getPublicProfile`, and tighten the component/type
contracts so the narrow shape is compiler-enforced.

### Changes Required:

#### 1. Owner-detail page

**File**: `src/pages/map/[id].astro`

**Intent**: Fetch another owner via the foreign-safe read so the page can never receive
street/coords.

**Contract**: Replace `getProfile(supabase, id)` (line 24) with `getPublicProfile(supabase, id)`; local `profile` typed `PublicProfile | null`. Self-profile branch (`isOwnProfile`) is unaffected (it redirects, never reads).

#### 2. `OwnerProfile` component props

**File**: `src/components/owners/OwnerProfile.astro`

**Intent**: Accept only the public shape; drop the street from the displayed location.

**Contract**: `Props.profile` becomes `PublicProfile` (was `Profile`). Line 25 simplifies to `const location = profile.city;` (remove the `profile.street ? …` composition). No other field references change (name/city/avatarUrl remain).

#### 3. Dev kitchen-sink fixture

**File**: `src/pages/dev/owner-profile-kitchen-sink.astro`

**Intent**: Keep the visual gate compiling against the narrowed props.

**Contract**: Drop `street` from the fixture profile object(s); ensure fixtures satisfy `PublicProfile`. Pure fixture edit.

#### 4. Pack hydration

**File**: `src/lib/services/pack.ts`

**Intent**: Attach only the public shape to pack members so the hydrated `PackView` can't
serialize street/coords.

**Contract**: `hydrateMembers` (line 170-178) calls `getPublicProfile` instead of `getProfile` (line 174). Import switches accordingly.

#### 5. `PackMember` type

**File**: `src/types.ts`

**Intent**: Make the narrowed member shape compiler-enforced end to end.

**Contract**: `PackMember.profile` becomes `PublicProfile` (was `Profile`). `PackView` already reads only name/city/avatarUrl (PackView.tsx:64,66,103,105-107) — no component change needed.

### Success Criteria:

#### Automated Verification:

- Type checking passes with narrowed props/types: `npm run build`
- Linting passes: `npm run lint`
- Full unit suite passes: `npm run test`

#### Manual Verification:

- `/map/[id]` for another owner shows no street — city only.
- `view-source` (or devtools) on `/pack` contains no street text and no coordinate numbers for members.
- Pack list and owner-detail still render name, city, avatar, and all actions correctly.

**Implementation Note**: Pause for human confirmation of the two manual leak checks before Phase 3.

---

## Phase 3: Test-fixture hygiene

### Overview

Remove real-looking production coordinates from the discovery unit test.

### Changes Required:

#### 1. Synthetic coordinates in discovery test

**File**: `tests/unit/discovery.test.ts`

**Intent**: The fixture comment (line 11) labels the coordinates as pulled from a real
production profile row. Replace with clearly synthetic values and relabel, keeping the
geometric relationships the assertions depend on (off-dictionary pin ~3 km from Tyczyn,
~250 km from the far city).

**Contract**: Replace `KIELNAROWA_PIN` / the Warszawa far-point literals (lines 12-14)
with synthetic coordinates that preserve the near/far distances the `withinDiscoveryRadius`
assertions check (lines 49-55), and rewrite the line-11 comment to drop the
"production profiles row" phrasing. Assertions and expected booleans unchanged.

### Success Criteria:

#### Automated Verification:

- Discovery test still passes with synthetic data: `npm run test`
- No remaining reference to production data in the file: `npm run test` + lint.

#### Manual Verification:

- Grep/read confirms no comment claims real/production coordinates remain in `tests/unit/`.

**Implementation Note**: After automated verification passes, this change is complete.

---

## Testing Strategy

### Unit Tests:

- New `publicProfile.test.ts`: forbidden-key regex + `JSON.stringify` secret-coordinate scan on `getPublicProfile` output; assert `city`/`name` present.
- Existing `locationPrivacy.test.ts` (map pins) and `discovery.test.ts` continue to pass.

### Integration Tests:

- None added here. End-to-end proof of the full critical flow is the separate
  `critical-path-e2e-proof` change (frame.md Scope Cut #4).

### Manual Testing Steps:

1. Open `/map/[id]` for an owner who has a street saved → only city shows.
2. `view-source` on `/pack` with at least one accepted member + one pending request → no street text, no coordinate numbers.
3. Open `/profile` (self) → street and location pin still present and editable (self path unchanged).

## Migration Notes

None — no schema or data changes. Pure service/type/view read-path change.

## References

- Frame brief: `context/changes/owner-location-privacy/frame.md`
- Leak sites: `src/lib/services/profile.ts:62,122`, `src/pages/map/[id].astro:24`, `src/components/owners/OwnerProfile.astro:25`, `src/lib/services/pack.ts:170-178`, `src/pages/pack.astro:26`
- Pattern to mirror: `tests/unit/locationPrivacy.test.ts:47-95`
- Already-safe reference: `src/pages/meetings/index.astro:47-50`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Narrowed public shape + foreign read seam (test-first)

#### Automated

- [x] 1.1 New regression test is present and passes: `npm run test` — d1bc94d
- [x] 1.2 Existing privacy test still passes (`locationPrivacy`): `npm run test` — d1bc94d
- [x] 1.3 Type checking passes: `npm run build` — d1bc94d
- [x] 1.4 Linting passes: `npm run lint` — d1bc94d

#### Manual

- [x] 1.5 Confirmed test fails before `getPublicProfile` exists (genuine red→green) — d1bc94d

### Phase 2: Route foreign call sites through the narrow shape

#### Automated

- [x] 2.1 Type checking passes with narrowed props/types: `npm run build` — 9d1a996
- [x] 2.2 Linting passes: `npm run lint` — 9d1a996
- [x] 2.3 Full unit suite passes: `npm run test` — 9d1a996

#### Manual

- [x] 2.4 `/map/[id]` for another owner shows no street (city only) — 9d1a996
- [x] 2.5 `view-source` on `/pack` contains no street text and no coordinates for members — 9d1a996
- [x] 2.6 Pack list and owner-detail still render name, city, avatar, and actions correctly — 9d1a996

### Phase 3: Test-fixture hygiene

#### Automated

- [x] 3.1 Discovery test passes with synthetic data: `npm run test`
- [x] 3.2 Lint passes and no production-data reference remains: `npm run lint`

#### Manual

- [x] 3.3 Confirmed no comment claims real/production coordinates remain in `tests/unit/`
