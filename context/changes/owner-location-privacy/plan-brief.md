# Owner Location/Street Privacy — Plan Brief

> Full plan: `context/changes/owner-location-privacy/plan.md`
> Frame brief: `context/changes/owner-location-privacy/frame.md`

## What & Why

The discovery/owner-detail read path returns and renders columns the PRD marks
private (`street` + exact `location_lat/lng`) to users who are not their owner — a
column-exposure problem across the service query, DTO, and view, which RLS
structurally cannot fix. We give foreign reads a narrowed shape that can't carry
street or coordinates, closing a user-visible street leak (owner-detail) and a
client-side coordinate leak (pack).

## Starting Point

`getProfile` does `select("*")` and is dual-use. For another user it still returns
`street` + exact coords: `/map/[id]` renders the street on screen, and `/pack` ships
the whole foreign profile into a `client:load` React island (coords land in the HTML).
Map-pin and meetings paths already narrow their output and stay untouched.

## Desired End State

A foreign read returns `PublicProfile` (id, name, city, avatar only). Owner-detail
shows at most a city; the pack page's HTML holds no street and no coordinates for any
member; the viewer's own profile read/edit is unchanged; a regression test fails if a
future change re-widens the foreign read.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Problem framing | Column exposure across query+DTO+view; RLS can't fix | Confirmed by reading the read path | Frame |
| Leading scope | #1 only; other 4 review items split out | Heterogeneous concerns, different natures | Frame |
| Enforcement layer | Service-layer DTO + `select()` column allow-list | Lightest, unit-testable without a DB (Docker/WSL2 blocked) | Plan |
| Foreign coordinates | Omit entirely | No foreign consumer needs them; radius scoping is server-side | Plan |
| API shape | New `getPublicProfile` + `PublicProfile` type | Type-level guarantee a re-leak is a compile error | Plan |
| Call-site scope | All foreign reads (owner-detail + pack) | Pack is a real client-side coord leak, not just display | Plan |

## Scope

**In scope:**
- `PublicProfile` type + `getPublicProfile` service read (column allow-list)
- Repoint `/map/[id]` and `pack.ts:hydrateMembers`; narrow `OwnerProfile` props and `PackMember.profile`
- Failing-first regression test; `discovery.test.ts` synthetic-coords cleanup

**Out of scope:**
- DB view / migration / RLS change (deferred defense-in-depth)
- Coarse/rounded coordinates
- Self read/write path; already-safe map-pin and meetings paths
- The other four review items (own changes)

## Architecture / Approach

Type-narrowing over a runtime flag: a dedicated foreign read + a smaller type make the
private columns unreachable on foreign paths at compile time. Test-first (red→green)
per the debugging lesson, then repoint the two call sites, then tighten the types so
the compiler enforces the contract. `getProfile` (self) is left fully intact.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Narrow shape + seam (test-first) | `PublicProfile`, `getPublicProfile`, failing→green regression test | Test must genuinely fail first, not be a tautology |
| 2. Route foreign call sites | `/map/[id]` + pack on the narrow shape; props/types tightened | Missing a foreign consumer; verify pack HTML has no coords |
| 3. Fixture hygiene | Synthetic coords in `discovery.test.ts` | Preserving near/far distances the assertions depend on |

**Prerequisites:** none — pure read-path change, no DB/migration, no new deps.
**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- Assumes no foreign consumer needs coordinates — verified against current call sites; a future coarse-position feature would add a field deliberately.
- Service-layer enforcement leaves RLS able to read columns via a direct query; DB-level hardening is a conscious deferral (needs a live DB to test).
- `astro check`/vite cache can crash on a stale cache — clear `node_modules/.vite .astro` if the type check misbehaves (project memory).

## Success Criteria (Summary)

- Another owner's profile page shows no street; the pack page ships no street or coordinates to the browser.
- A regression test red-flags any future re-widening of the foreign read.
- The viewer's own profile read/edit is unchanged, and all existing privacy/discovery tests stay green.
