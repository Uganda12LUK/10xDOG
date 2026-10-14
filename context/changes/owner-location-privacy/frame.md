# Frame Brief: Owner location/street privacy leak (leading) + 5-item scope cut

> Framing step before /10x-plan. Captures what is *actually* at issue, separated
> from what was initially assumed. A 5-item review was split by nature; this brief
> confirms the leading concern (#1) and records the scope cut for the rest.

## Reported Observation

Five distinct findings in PawMeet, each already paired with a cause + proposed fix:

1. Another user's **street** and **exact GPS** reach the client (PRD says they must not).
2. Pack/invitation RLS lets a sender bypass mutual consent (forge `accepted`, mutate participants).
3. Three call sites use `CITY_CENTERS[...]` directly instead of the shared `cityCenter()` normalizer.
4. No saved proof of the critical flow (signup→profile→dog→discover→invite→accept→meeting visible to both).
5. README/AGENTS docs describe the scaffold ("no tables/migrations", branch `master`, "CI does not run").

## Initial Framing (preserved)

- **User's stated cause/approach**: each finding carries an accurate cause and a concrete proposed fix.
- **User's proposed direction**: resolve the whole list via the 10x chain.
- **Pre-dispatch narrowing**: split by nature (separate changes); leading concern = **#1 location/street leak**; #4 is a **verification gap, not a bug** (flow likely works, proof is missing).

## Dimension Map (for the leading concern, #1)

Where could "another user's street + exact GPS reach the client" originate?

1. **DB row policy (RLS)** — profiles readable by all authenticated users. True, but RLS filters rows, not columns — *cannot* hide `district`/`location_*`.
2. **Service query layer** — `select("*")` in `listOwners` (profile.ts:127) and `listProfilesByIds` (profile.ts:186) pulls every column.  ← **initial framing**
3. **DTO / mapping layer** — `mapRow` (profile.ts:33–51) returns a full `Profile` incl. `street` + exact `locationLat/Lng` to every caller.
4. **View layer** — `OwnerProfile.astro:25` composes and renders another owner's `street`.
5. **Test fixtures** — `discovery.test.ts:11-12` hardcodes coords labelled "from the production profiles row" (data-hygiene, not the leak itself).

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| RLS is the fix (row policy) | RLS limits rows only; `district`/`location_*` still selectable by any authenticated reader | NONE (correctly ruled out by user) |
| Service `select("*")` over-fetches | profile.ts:127, :186 — `select("*")`; self-read `getProfile` (:63) is fine (own row) | STRONG |
| DTO carries private columns | `mapRow` maps `street`+exact `locationLat/Lng`; `listOwners` returns these for *other* users (p.id !== userId, :142) | STRONG |
| View renders another user's street | `OwnerProfile.astro:25` `profile.street ? …` → shown on `/map/[id]` | STRONG |
| Test uses production coords | `discovery.test.ts:11-12` comment "pulled from the production profiles row" | STRONG (secondary) |

## Narrowing Signals

- User confirmed **split by nature** and **#1 leading** — so this brief scopes #1 deeply; others get their own frame/new.
- The leak is specifically to **other** users: `getProfile` (self) is fine; `listOwners` filters out the viewer then returns full profiles of everyone else → the exposed surface is exactly the discovery/owner-detail path.

## Cross-System Convention

Supabase's own guidance: RLS does not do column-level protection — expose a narrowed **view** or a **DTO/`select` column allow-list** for public reads, keep precise fields server-side. The repo already has a presentation-only `Profile`→view split (`OwnerProfile.astro` is pure props), so a narrowed public shape fits the existing architecture. The user's proposed fix matches convention.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: the discovery/owner-detail read path returns and renders columns the PRD marks private (`street`, exact `location_lat/lng`) to users who are not their owner — a **column-exposure** problem at the service + DTO + view layers, which RLS structurally cannot fix.

The initial framing was **correct**. The only refinements: (a) the fix spans three layers (query `select`, the `Profile`→public shape, the view), not one; (b) exact coords leak too, not just street — discovery only needs a coarse/approx position (the map already jitters pins ±2 km and filters town-center to town-center, so precise GPS is never required for the feature); (c) `discovery.test.ts` fixtures are a separate data-hygiene cleanup to fold in.

## Confidence

**HIGH** — strong file:line evidence at every layer, matches Supabase convention, and a decisive user narrowing signal. No reproduction needed; the leak is visible by reading the read path.

## What Changes for /10x-plan

Plan a **public owner shape** (e.g. a `PublicProfile` DTO with an explicit column allow-list, or a DB view) that omits `street` and replaces precise `location_*` with a coarse position sufficient for town-level discovery; route `listOwners`/`listProfilesByIds`/`OwnerProfile` through it; keep precise fields only on the self path (`getProfile`/`upsertProfile`). Per the debugging lesson, the plan starts with a **failing regression test** asserting a non-owner read excludes `street`/precise GPS. Fold in the `discovery.test.ts` synthetic-coords cleanup.

## Scope Cut (sibling changes — frame/new each when its turn comes)

| # | Change (suggested id) | Nature | Entry skill | Notes |
| --- | --- | --- | --- | --- |
| 1 | `owner-location-privacy` (this) | Security — column exposure | /10x-plan → /10x-tdd | Leading; regression test first |
| 2 | `pack-consent-rls` | Security — RLS state machine | /10x-frame → /10x-plan → /10x-tdd | INSERT must force `status='pending'`; participant immutability; `pending→accepted/declined` only by correct actor; applies to `pack_connections` (ins l.49 / upd l.57) **and** `invitations` (ins l.47 / upd l.55); audit `are_in_pack` SECURITY DEFINER (messages l.13). RLS tests need a DB — see WSL2/Docker blocker memory |
| 3 | `city-normalization-consistency` | Consistency refactor | /10x-plan or direct /10x-tdd | Route `dogFilter.ts:74`, `DogMap.tsx:35`, `OwnersMapView.tsx:76` through `cityCenter()`; low risk, pure-function test |
| 4 | `critical-path-e2e-proof` | Verification artifact (not a bug) | /10x-e2e | Produce the dated report (commit/env/tests run+skipped/assertions). Blocked on remote test Supabase setup — see E2E memories |
| 5 | `docs-refresh` | Docs accuracy | direct edit | `README.md:5` (starter→PawMeet, tables/migrations exist, `master`→`main`); `AGENTS.md:33` ("CI does not run" is false — CI is on `main`) |

## References

- Source: `src/lib/services/profile.ts:63,127,186`, `src/components/owners/OwnerProfile.astro:25`, `tests/unit/discovery.test.ts:11-12`, `src/lib/geo.ts`
- Scope-cut evidence: `supabase/migrations/20261007090001_create_pack_connections.sql:49,57`, `supabase/migrations/20260926090001_create_invitations.sql:47,55`, `supabase/migrations/20261007090002_create_messages.sql:13`, `src/lib/dogFilter.ts:74`, `src/components/map/DogMap.tsx:35`, `src/components/map/OwnersMapView.tsx:76`, `README.md:5`, `AGENTS.md:33`
- Investigation: direct reads (evidence conclusive; parallel hypothesis dispatch not needed)
