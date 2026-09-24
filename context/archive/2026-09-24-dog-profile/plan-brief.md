# Dog Profile (S-02) — Plan Brief

> Full plan: `context/changes/dog-profile/plan.md`

## What & Why

Build the dog-profile slice (PRD FR-003 / US-01): a logged-in user can create and edit dog profiles (name, breed, age, photo), owning **many dogs**. Dogs are the core matching unit for later socialization and breeding flows, so their data (especially breed) must be clean from the start.

## Starting Point

The S-01 owner-profile slice (archived) already delivered the F-01 foundation: Supabase migrations workflow, the granular per-operation RLS convention, the `avatars` Storage bucket with a per-user path-prefix policy, and reusable patterns — `profile.ts` service, `/api/profile` endpoint, `ProfileForm` island, `src/types.ts`. S-02 clones this vertical for a one-to-many entity. No test runner exists (lint app-source-clean + build + manual verification).

## Desired End State

At `/dogs`, a user sees a list of their dogs (name, breed, age, photo) and can add / edit / delete each via a form (name, breed dropdown, birth date, photo). Each dog is a `dogs` row with `owner_id = auth.uid()`; photos live in `avatars/<uid>/dogs/<dogId>.<ext>`. RLS: any authenticated user can read dogs (enables later breeding/discovery), only the owner can write/delete; anonymous access impossible.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Cardinality / ownership | Many dogs per user; `dogs.owner_id → auth.users.id` | Natural model; breeding slices treat each dog as the matching unit | Plan |
| Breed representation | Controlled in-code list (`src/lib/breeds.ts`) + zod enum | Reliable same-breed matching for S-07/S-08; no off-list values persist | Plan |
| Age | Store `birthdate`, derive age | Age stays correct over time; supports future age filter | Plan |
| Photo storage | Reuse `avatars` bucket at `<uid>/dogs/<dogId>.<ext>` | Bucket + per-user RLS already exist; zero new infra | Plan |
| UI shape | `/dogs` list + add/edit pages | Clean CRUD for multiple dogs; mirrors the profile page+island pattern | Plan |
| Breed source | Hardcoded curated constant (not DB table/enum) | Simplest for MVP; constrained input keeps matching reliable | Plan |
| Delete | Included (owner-only RLS + endpoint) | A multi-dog list needs removal; natural scope | Plan |

## Scope

**In scope:** `dogs` table + RLS (read-all / owner-only write+delete) + indexes, breed constant + zod schema, `Dog`/`DogInput` types, dog service (list/get/upsert/delete + photo upload), `/api/dogs` (+ `/[id]`) endpoints, `/dogs` list + add/edit UI, `/dogs` gating + nav link.

**Out of scope:** breeding flag/discovery (S-06–S-08), owner discovery (S-03), breed DB table/enum or external API, dog-specific onboarding gate, filters (FR-008).

## Architecture / Approach

Clone the S-01 vertical bottom-up: **Phase 1** `dogs` migration (RLS reused; `avatars` bucket unchanged) + breed constant; **Phase 2** `Dog` types → `dog.ts` service → `/api/dogs` endpoints (create/update/delete + photo); **Phase 3** `/dogs` list + `DogForm` island (breed `<select>`, birthdate `<input type=date>`, photo) + middleware gate + nav link. Reuses `@/` alias, null-guarded SSR client, zod redirect-on-error, `client:load` islands, `cn()`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data & breed vocab | `dogs` table + RLS + indexes; breed constant + zod | Not redefining `set_updated_at()` (exists from S-01); correct owner-only RLS |
| 2. Backend & types | `Dog` types, service, `/api/dogs` endpoints + photo + delete | Breed enum validation; photo path under `<uid>/dogs/` to satisfy Storage policy |
| 3. UI & nav | `/dogs` list + add/edit/delete, gate, nav link | Multi-page form reuse; date/select field UX; mobile |

**Prerequisites:** S-01 foundation (done); live Supabase (project `bhxavwzgoygjtytqmlak`, Frankfurt) — apply migration via dashboard SQL editor (no local Docker); Node 22.14.0.
**Estimated effort:** ~2–3 sessions across 3 phases (fast — heavy reuse of S-01).

## Open Risks & Assumptions

- Breed list is curated in code; adding breeds later needs a code change + deploy (accepted for MVP).
- Same-breed matching (S-07) depends on all dogs storing exact list values — enforced by the zod enum server-side.
- `set_updated_at()` must NOT be recreated in the dogs migration (already global from profiles).

## Success Criteria (Summary)

- A logged-in user can add, edit, and delete multiple dogs (name, breed-from-list, birth date, photo) that persist correctly.
- Anonymous access to dog data is refused; only the owner can modify their dogs.
- Breed is always a valid list value, so later breeding same-breed matching will work.
