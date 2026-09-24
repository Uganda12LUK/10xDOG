# Dog Profile (S-02) Implementation Plan

## Overview

Implement the **dog-profile** slice (PRD FR-003 / US-01): a logged-in user can create and edit dog profiles (name, breed, age, photo), owning **many dogs**. It is the dog analog of the owner-profile slice (S-01) and reuses that slice's data/privacy foundation, Storage bucket, and form/endpoint/service patterns.

## Current State Analysis

- **F-01 foundation is live** (delivered in S-01, archived at `context/archive/2026-09-23-owner-profile/`): Supabase migrations workflow, the granular per-operation RLS convention, and the `avatars` Storage bucket with a per-user path-prefix write policy.
- **Reusable S-01 code, to mirror for dogs:**
  - `supabase/migrations/20260923090001_create_profiles.sql` — table + RLS pattern to clone (`select` for `authenticated`; `insert`/`update` restricted to `auth.uid()`), plus the `set_updated_at()` trigger (already defined globally — do NOT redefine it).
  - `supabase/migrations/20260923090002_create_avatars_bucket.sql` — the `avatars` bucket write policy checks `(storage.foldername(name))[1] = auth.uid()::text`, so objects at `<uid>/dogs/<...>` are already covered. **No new Storage migration is needed.**
  - `src/lib/services/profile.ts` — service shape: `getProfile`/`upsertProfile`/`uploadAvatar(client, userId, file)` uploading to `avatars/<userId>/avatar.<ext>`; maps snake_case rows → camelCase; derives public URL via `storage.from("avatars").getPublicUrl`.
  - `src/pages/api/profile.ts` — endpoint pattern: `export const prerender = false`, read `formData`, zod validate, `redirect(/profile?error=…)` on failure / `?saved=1` on success; null-client guard; `auth.getUser()` gate.
  - `src/components/profile/ProfileForm.tsx` — island pattern (`client:load`, `FormField`/`SubmitButton`/`ServerError`, `enctype="multipart/form-data"`, client-side required-field validation).
  - `src/pages/profile.astro` — protected page that loads the row(s) via the service and mounts the island.
  - `src/middleware.ts` — `PROTECTED_ROUTES = ["/dashboard", "/profile"]` (add `/dogs`); soft-onboarding block already runs `getProfile` on protected routes.
  - `src/types.ts` — `Profile`/`ProfileInput`; add `Dog`/`DogInput` here.
- **`set_updated_at()` already exists** from the profiles migration — the dogs migration attaches a trigger using it, but must NOT `create function set_updated_at()` again (would error).
- **No test runner** — automated verification is `npm run lint` (fails only on pre-existing CRLF/`.claude` course files, not app source) + `npm run build`; migration apply + manual checks run against the live Supabase (project `bhxavwzgoygjtytqmlak`, Frankfurt) via the dashboard SQL editor (Docker unavailable locally). See `[[pawmeet-deploy-and-supabase-ops]]`.

### Key Discoveries:

- `supabase/migrations/20260923090001_create_profiles.sql:15` — `set_updated_at()` is defined once; dogs migration reuses it (trigger only).
- `src/lib/services/profile.ts:65` — `uploadAvatar` path convention `<userId>/avatar.<ext>`; dog photos go to `<userId>/dogs/<dogId>.<ext>`, same bucket, same policy.
- `src/middleware.ts:5` — add `/dogs` to `PROTECTED_ROUTES`.
- `src/components/auth/FormField.tsx` — controlled text field; the breed `<select>` and birthdate `<input type="date">` are new field shapes not covered by `FormField`, so add them inline in `DogForm` (like the photo `<input type="file">` in `ProfileForm`).

## Desired End State

A logged-in user visits `/dogs`, sees a list of their dogs (each showing name, breed, age, photo), and can add a new dog or edit/delete an existing one via a form (name, breed from a dropdown, birth date, photo). Each dog is a row in a `dogs` table keyed by its own id with `owner_id = auth.uid()`; photos live in `avatars/<uid>/dogs/<dogId>.<ext>`. RLS lets any authenticated user read dogs (enabling later breeding/discovery slices) while only the owner can insert/update/delete their own dogs; anonymous access is impossible.

Verify: apply the migration, sign in, add two dogs with photos, edit one, delete one, confirm the list reflects each change, the breed is constrained to the list, age is derived from birth date, and an anonymous read of `dogs` is refused by RLS.

## What We're NOT Doing

- **No breeding availability flag / discovery (S-06, S-07, S-08)** — this slice only stores the dog. Breed is captured as a constrained value *so that* those slices can match on it, but no breeding UI/flag is built.
- **No owner-discovery list (S-03)** — the read-all RLS policy enables it later; no listing beyond the owner's own dogs is built here.
- **No breed table / enum in the DB, no external breed API** — breeds are a curated in-code constant validated by zod.
- **No dog-specific onboarding gate** — the owner-profile soft nudge stays as-is; `/dogs` is reachable via a link, not a forced flow.
- **No filters (FR-008)** — parked.

## Implementation Approach

Clone the S-01 vertical for a one-to-many entity: (1) a `dogs` migration reusing the RLS pattern + a breed constant module, (2) typed backend (DTO + service + endpoints incl. photo upload and delete), (3) the `/dogs` list + add/edit UI. Follow every S-01 convention (`@/` alias, null-guarded SSR client, zod validation with redirect-on-error, `client:load` islands, `cn()` for classes). Reuse the `avatars` bucket unchanged.

## Critical Implementation Details

- **Do not redefine `set_updated_at()`.** It already exists from the profiles migration. The dogs migration creates only the `dogs` table, its RLS policies, and a trigger that calls the existing function.
- **Storage policy already covers dog paths.** The `avatars` insert/update policy matches `(storage.foldername(name))[1] = auth.uid()::text`, i.e. the first path segment must equal the user id. Uploading to `<uid>/dogs/<dogId>.<ext>` satisfies it with no new policy. Uploading anywhere whose first segment isn't the uid will be rejected.
- **Breed value is the source of truth for same-breed matching (S-07).** Store the exact constant value (not a free-typed string); validate server-side with a zod enum built from the constant so no off-list value can persist.

## Phase 1: Data Foundation & Breed Vocabulary

### Overview

Create the `dogs` table with granular RLS (reusing the S-01 pattern), and the curated breed list + zod schema. Reuse the `avatars` bucket unchanged.

### Changes Required:

#### 1. Dogs table migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_create_dogs.sql`

**Intent**: Create the dog entity — many per user — keyed by its own id with an `owner_id` FK to the auth user, and turn on granular RLS mirroring the profiles convention.

**Contract**: Table `dogs`: `id uuid primary key default gen_random_uuid()`, `owner_id uuid not null references auth.users(id) on delete cascade`, `name text not null`, `breed text not null`, `birthdate date`, `photo_path text`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`. Index on `owner_id` (list-by-owner) and on `breed` (future S-07 matching). `alter table dogs enable row level security`. Policies for role `authenticated`: `select` using `true`; `insert` with check `auth.uid() = owner_id`; `update` using/with check `auth.uid() = owner_id`; `delete` using `auth.uid() = owner_id`. Attach a `before update` trigger calling the **existing** `set_updated_at()` (do not recreate the function).

#### 2. Breed vocabulary + schema

**File**: `src/lib/breeds.ts` (new)

**Intent**: Single source of truth for allowed breeds, usable by the `<select>`, the zod validator, and later the S-07 matcher.

**Contract**: Export `BREEDS` — a curated `readonly` array of breed strings (popular dog breeds) that includes an explicit `"Mixed / Other"` entry. Export a helper/type derived from it (e.g. a `Breed` union) so the endpoint's zod schema can be `z.enum([...BREEDS])`. Order alphabetically; keep it a plain constant (no DB, no fetch).

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly against the live/local Supabase (dashboard SQL editor or `npx supabase migration up`)
- Lint passes on app source: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- With RLS on, an anonymous read of `dogs` returns no rows / is refused; an authenticated user cannot insert a dog with a foreign `owner_id`.
- Inserting a dog under `owner_id = auth.uid()` succeeds; deleting another user's dog is refused.

**Implementation Note**: After automated verification passes, pause for manual confirmation before the next phase.

---

## Phase 2: Dog Backend & Types

### Overview

Add the typed dog contract: `Dog`/`DogInput` in `src/types.ts`, a dog service, and the `/api/dogs` endpoints (create, update, delete) including photo upload to the reused bucket.

### Changes Required:

#### 1. Shared Dog types

**File**: `src/types.ts` (edit)

**Intent**: Shared entity + DTO for dogs so endpoints, service, and UI agree.

**Contract**: Add `Dog` (`id`, `ownerId`, `name`, `breed`, `birthdate: string | null`, `photoPath`/`photoUrl`, timestamps) and `DogInput` (writable subset: `name`, `breed`, `birthdate?`, `photo?: File | null`). Keep `Profile`/`ProfileInput` untouched.

#### 2. Dog service

**File**: `src/lib/services/dog.ts` (new)

**Intent**: Encapsulate dog read/list/upsert/delete and photo upload against the Supabase client (mirror `profile.ts`).

**Contract**: `listDogs(client, ownerId): Promise<Dog[]>` (order by `created_at`), `getDog(client, id): Promise<Dog | null>`, `createDog` / `updateDog` (or a single `upsertDog(client, ownerId, input, id?)`), `deleteDog(client, ownerId, id)`, and `uploadDogPhoto(client, ownerId, dogId, file): Promise<string>` uploading to `avatars/<ownerId>/dogs/<dogId>.<ext>` with `{ upsert: true }`. Map snake_case → camelCase; derive `photoUrl` from `photo_path` via `getPublicUrl`. Preserve existing `photo_path` on a text-only edit (omit the column when no new photo). Typed with `SupabaseClient` like `profile.ts`.

#### 3. Dog API endpoints

**Files**: `src/pages/api/dogs/index.ts` (new, create) and `src/pages/api/dogs/[id].ts` (new, update + delete)

**Intent**: Accept dog form submissions, validate, upload photo if present, and write — mirroring the auth/profile redirect-on-error contract.

**Contract**: Both export `const prerender = false`. `index.ts` `POST` = create: read `formData`, zod-validate (`name` non-empty; `breed` = `z.enum([...BREEDS])`; `birthdate` optional valid date not in the future; photo optional image ≤5 MB), upload photo, insert row, redirect `/dogs?saved=1` (or `/dogs/<id>`); on error `redirect(/dogs/new?error=…)`. `[id].ts` `POST` = update (same validation, ownership enforced by RLS) redirect `/dogs?saved=1`; a delete action (e.g. a `_action=delete` form field, or `DELETE`) removes the dog and its photo, redirect `/dogs`. Null-client guard + `auth.getUser()` gate as in `profile.ts`.

### Success Criteria:

#### Automated Verification:

- Lint passes on app source: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- Creating a dog persists a row with the chosen breed + birthdate + photo at `avatars/<uid>/dogs/<dogId>.<ext>`.
- Editing a dog updates the same row (no duplicate); a text-only edit preserves the existing photo.
- Deleting a dog removes the row; an off-list breed or future birthdate is rejected with a readable `?error=`.

**Implementation Note**: After automated verification passes, pause for manual confirmation before the next phase.

---

## Phase 3: Dogs UI & Navigation

### Overview

Add the `/dogs` section: a list of the user's dogs plus add/edit forms, gate `/dogs`, and link to it from the profile/topbar.

### Changes Required:

#### 1. Dogs list page

**File**: `src/pages/dogs/index.astro` (new)

**Intent**: Server-render the list of the current user's dogs with an "Add dog" link and per-dog edit links; surface `?saved=1`.

**Contract**: Uses `Astro.locals.user` + `listDogs` to load `Dog[]`, renders each (name, breed, derived age, photo) inside `Layout.astro` with links to `/dogs/new` and `/dogs/<id>`, plus an empty-state when the list is empty. Follows the existing page styling.

#### 2. Dog create/edit pages + form island

**Files**: `src/pages/dogs/new.astro` (new), `src/pages/dogs/[id].astro` (new), `src/components/dogs/DogForm.tsx` (new)

**Intent**: One island form for create and edit — name, breed dropdown, birth date, photo — reused by both pages.

**Contract**: `DogForm` props `{ dog?: Dog | null; serverError?: string | null }`; `method="POST"` `enctype="multipart/form-data"`, action `/api/dogs` (create) or `/api/dogs/<id>` (edit). Name via `FormField`; **breed** via a `<select>` populated from `BREEDS`; **birthdate** via `<input type="date">` (max = today); photo via `<input type="file">` with preview of existing `photoUrl`; `ServerError`; required-name client validation. `new.astro` mounts an empty form; `[id].astro` loads the dog via `getDog` (404/redirect if not owner-visible) and mounts a pre-filled form, and hosts the delete control (a small POST form to `/api/dogs/<id>` with the delete action). Age shown via a small `birthdate → age` helper.

#### 3. Gate + navigation

**File**: `src/middleware.ts` (edit) and a link from `src/pages/profile.astro` (and/or `src/components/Topbar.astro`)

**Intent**: Require login for `/dogs` and make it discoverable.

**Contract**: Add `"/dogs"` to `PROTECTED_ROUTES`. Add a visible link to `/dogs` from the profile page (and/or Topbar) so a logged-in user can reach their dogs. No onboarding redirect for dogs.

### Success Criteria:

#### Automated Verification:

- Lint passes on app source: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- `/dogs` while logged out redirects to `/auth/signin`; while logged in shows the user's dogs (or an empty state).
- Adding a dog shows it in the list with correct breed, derived age, and photo; editing reflects changes; deleting removes it.
- Breed field only offers list values; birth date cannot be set in the future; page is usable at mobile width.

**Implementation Note**: After automated verification passes, pause for manual confirmation.

---

## Testing Strategy

### Unit Tests:

- No unit-test runner in the project; the zod schema (breed enum, birthdate) is exercised via manual + build verification.

### Integration Tests:

- Manual end-to-end against the live Supabase (project `bhxavwzgoygjtytqmlak`): migration applied via SQL editor, auth session live.

### Manual Testing Steps:

1. Apply the dogs migration (SQL editor), `npm run dev`, sign in.
2. Visit `/dogs` → empty state; add a dog (name + breed from list + birth date + photo) → appears in list.
3. Add a second dog; edit the first (change breed) → list updates, one row per dog.
4. Delete the second dog → removed from list and Storage.
5. Try an off-list breed / future birth date via a tampered POST → rejected with `?error=`.
6. Log out → `/dogs` redirects to signin; anonymous read of `dogs` refused by RLS.

## Performance Considerations

- The `/dogs` list is a single `select` by `owner_id` (indexed). NFR <2s applies to discovery lists (S-03/S-07), not this owner-scoped list.

## Migration Notes

- One additive migration (`dogs` table + RLS + trigger). No Storage migration (reuses `avatars`). Apply to the live project before deploy; RLS enabled from the migration.

## References

- Roadmap item S-02: `context/foundation/roadmap.md` (§Slices → S-02)
- PRD FR-003 / US-01: `context/foundation/prd.md`
- S-01 precedent (archived): `context/archive/2026-09-23-owner-profile/plan.md`
- Profiles migration + RLS pattern: `supabase/migrations/20260923090001_create_profiles.sql`
- Avatars bucket policy (covers dog paths): `supabase/migrations/20260923090002_create_avatars_bucket.sql`
- Service pattern: `src/lib/services/profile.ts`
- Endpoint pattern: `src/pages/api/profile.ts`
- Form island pattern: `src/components/profile/ProfileForm.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data Foundation & Breed Vocabulary

#### Automated

- [ ] 1.1 Dogs migration applies cleanly (SQL editor / `npx supabase migration up`)
- [ ] 1.2 Lint passes on app source (`npm run lint`)
- [x] 1.3 Build passes (`npm run build`) — 0c4c454

#### Manual

- [ ] 1.4 RLS: anonymous read refused; user cannot insert a dog with a foreign `owner_id`
- [ ] 1.5 Owner can insert own dog; cannot delete another user's dog

### Phase 2: Dog Backend & Types

#### Automated

- [ ] 2.1 Lint passes on app source (`npm run lint`)
- [x] 2.2 Build passes (`npm run build`)

#### Manual

- [ ] 2.3 Create persists row with breed + birthdate + photo at `avatars/<uid>/dogs/<dogId>.<ext>`
- [ ] 2.4 Edit updates same row (no duplicate); text-only edit preserves photo
- [ ] 2.5 Delete removes row; off-list breed / future birthdate rejected with `?error=`

### Phase 3: Dogs UI & Navigation

#### Automated

- [ ] 3.1 Lint passes on app source (`npm run lint`)
- [ ] 3.2 Build passes (`npm run build`)

#### Manual

- [ ] 3.3 `/dogs` logged out → redirect to `/auth/signin`; logged in → list or empty state
- [ ] 3.4 Add shows dog with correct breed + derived age + photo; edit reflects; delete removes
- [ ] 3.5 Breed field offers only list values; birth date cannot be future
- [ ] 3.6 `/dogs` pages usable at mobile width
