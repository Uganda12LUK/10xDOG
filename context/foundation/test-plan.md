# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-28 (Phase 1 change opened)

---

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface somewhere in <area>"
   carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is produced
   by `/10x-research` during each rollout phase. If the plan and research
   disagree about where the failure lives, research is the ground truth.

Hot-spot scope used for likelihood weighting: `src/` (excluding
`node_modules`, `dist`, `.next`).

---

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user/business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | Walk invitation loop fails end-to-end — user sends invitation but receiver never sees it in inbox, or accept/decline action does not update status, or confirmed meeting never appears for both parties | High | High | PRD FR-005/FR-006, US-01, Business Logic guardrail "zaproszenie trafia wyłącznie do wybranego użytkownika"; interview Q1; archive `walk-invitation-loop` |
| 2 | Auth gating regression — unauthenticated request reaches a protected route (`/owners`, `/invitations`, `/meetings`, `/profile`, `/dogs`) without being redirected to login | High | High | PRD NFR bezpieczeństwo dostępu, Access Control; hot-spot `src/middleware.ts` (8 commits/30d); interview Q3 |
| 3 | Meeting state machine inconsistency — meetings tab shows an entry for a pending or declined invitation (meeting visible before both parties have confirmed, or after one has declined) | High | Medium | PRD Business Logic "spotkanie żadnego typu nie istnieje dopóki obie strony go nie potwierdzą"; US-01 AC; archive `scheduled-meetings-view` |
| 4 | RLS bypass — authenticated user A can read or modify user B's profile, dog, or invitation rows via API or Supabase client directly | High | Medium | PRD NFR prywatność; archive `data-privacy-baseline`; hot-spot `src/lib/services/` (7 commits/30d); interview Q3 |
| 5 | Invitation IDOR — user can send a walk invitation to themselves, or a crafted POST targets a different user's receiver_id than the one the UI set | High | Medium | PRD Business Logic guardrail; archive `walk-invitation-loop` (partial unique index, self-invite CHECK constraint); hot-spot `src/pages/api/` (11 commits/30d) |
| 6 | Location/PII leakage — owner list API response or map pins expose precise coordinates or a home address beyond the district/city text the user entered | High | Low | PRD NFR prywatność "adres domowy ani precyzyjne współrzędne nie są widoczne"; roadmap U-03 (Leaflet map with owner pins, `done`) |
| 7 | Breeding filter broken — when S-06..S-08 lands, the breeding discovery list returns dogs of the wrong breed or dogs without the breeding flag set *(future — activates when breeding track is implemented)* | Medium | Medium | PRD FR-010, US-02 AC "wyłącznie psy oznaczone jako dostępne do hodowli i tej samej rasy"; roadmap S-06..S-08 `proposed` |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | User B receives an invitation sent by User A and can act on it; after accepting, the meeting appears in both parties' meetings tab | "build passes" implies the flow works end-to-end | State transition pending→accepted; meetings query filter; receiver_id lookup; how the inbox renders pending invitations | Integration (2-user scenario against real/local Supabase) | Testing only the sender's side; mocking the invitation service internals |
| #2 | Unauthenticated GET to each protected route returns a redirect to login, not page content | "middleware is present" implies it covers all routes including newly added ones | Full PROTECTED_ROUTES list; what happens when the Supabase client is in an unconfigured/null state; which routes exist but are not listed | Integration (HTTP request unauthenticated, per route) | Checking only `/dashboard`; unit-testing the redirect logic in isolation without an actual request |
| #3 | Meetings tab query returns zero rows for a pending invitation and zero rows for a declined invitation; returns one row only after both sides have accepted | "state machine is simple" implies the DB filter is correct | Which `status` values the meetings query filters on; whether the query uses `accepted` or checks absence of `pending/declined` | Integration (assert meetings list before/after each status transition) | Testing only the accepted case; not testing that pending/declined do not appear |
| #4 | User A's Supabase client cannot SELECT or UPDATE user B's profile, dog, or invitation row; attempt returns empty or an error | "RLS is enabled" implies policies are correctly scoped to auth.uid() | RLS policy bodies for profiles, dogs, invitations; which operations each policy covers; whether the service layer re-checks ownership beyond RLS | Integration (Supabase client authenticated as user A, targeting user B's row IDs) | Trusting the manual audit from F-01; testing only SELECT, not INSERT/UPDATE |
| #5 | POST to the send-invitation endpoint with receiver_id equal to the sender's own auth.uid() is rejected; the DB CHECK constraint fires; the partial unique index blocks a duplicate pending | "zod validates UUID format" implies it validates ownership | Whether the API reads the caller's identity from the session or trusts the form body; what the DB CHECK constraint is and whether it is applied in the local test DB | Integration (POST with receiver_id = own uid; POST with duplicate pending) | Testing only the happy-path receiver_id; skipping the self-send edge case |
| #6 | The owners list API JSON and map pin data contain only district/city text; no lat/lng fields, no precise address, no home street | "the UI shows only district" implies the API does not return coordinates | What fields the owners list API returns in its JSON response; what data the Leaflet map pins are built from; whether any location field stores more than the user's text input | Integration (inspect API response JSON for coordinate/address fields) + manual (network tab) | Checking only the rendered UI; not inspecting the raw API response body |
| #7 | Breeding list returns only dogs where `breeding_available = true` AND `breed = sender_dog.breed`; dogs with only one condition true are excluded | "filter is present" implies both conditions are AND-ed correctly | Which table column stores the breeding flag; which dog's breed is compared (sender's? sender's profile's dog?); edge: sender has no dog or no breed set | Integration (seed with mixed flag/breed combinations; assert filtered result) | Testing only the same-breed/flag-true case; not testing that non-matching dogs are excluded |

---

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Bootstrap + critical-path integration | Stand up vitest + Supabase test client; prove the north star invitation flow and auth gating regress automatically | #1, #2, #3 | integration | implementing | context/changes/testing-bootstrap-critical-path/ |
| 2 | Security integration layer | Prove RLS, invitation IDOR protection, and location/PII guardrail hold under automated verification | #4, #5, #6 | integration | not started | — |
| 3 | Breeding track coverage | When S-06..S-08 lands, lock breeding filter correctness before merge | #7 | integration | not started | — |
| 4 | Quality-gates wiring | Wire the full suite into CI on every push; formalize smoke gate | cross-cutting | gates | not started | — |

**Status vocabulary** (parser literals — do not rename):

| Value | Meaning |
|-------|---------|
| `not started` | No change folder for this rollout phase yet. |
| `change opened` | `context/changes/<id>/` exists with `change.md`; research not done. |
| `researched` | `research.md` exists in the change folder. |
| `planned` | `plan.md` exists with a `## Progress` section. |
| `implementing` | Progress section has at least one `[x]` and at least one `[ ]`. |
| `complete` | Progress section is fully `[x]`. |

---

## 4. Stack

No test runner is configured yet. Phase 1 bootstraps the suite.

| Layer | Tool | Notes |
|-------|------|-------|
| unit + integration | vitest | none yet — see §3 Phase 1; natural fit for TypeScript/Astro/Node ecosystem |
| Supabase test client | `@supabase/supabase-js` (already in deps) | none yet — Phase 1 research determines local vs. remote test DB strategy |
| e2e | Playwright `^1.49.0` (already in `dependencies`) | available; reserve for flows where auth + cookie + full server shape are required; do not use where integration suffices |
| pre-prod smoke | `scripts/smoke.mjs` (fetch-based, dependency-free) | already exists; covers auth flow against a live server; formalized as a gate in Phase 4 |

**Stack grounding tools (current session):**
- Docs: none — no Context7 or framework docs MCP available in this session; recommendations based on local `package.json` and ecosystem conventions; checked: 2026-09-28
- Search: none — no Exa.ai or web search MCP available in this session; checked: 2026-09-28
- Runtime/browser: IDE MCP available — can run diagnostics; Playwright already in deps for e2e if needed; checked: 2026-09-28
- Provider/platform: Cloudflare Observability MCP available — relevant for catching CF Workers runtime errors in CI; Supabase CLI in devDependencies for local DB reset; checked: 2026-09-28

---

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI | required (already wired) | syntactic / type drift |
| unit + integration suite | local + CI | required after §3 Phase 1 | logic regressions in invitation flow, auth gating, state machine, RLS |
| security integration suite | local + CI | required after §3 Phase 2 | RLS bypass, IDOR, PII leakage |
| pre-prod smoke (`npm run smoke`) | between merge + prod | required after §3 Phase 4 (formalized) | auth flow against live server; environment-specific failures |
| e2e on critical flows | CI on PR | optional after §3 Phase 1 | full-stack invitation flow regression requiring real browser + cookies |

---

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section fills in once the
relevant rollout phase ships; before that the sub-section reads
"TBD — see §3 Phase N."

### 6.1 Adding an integration test for an API route or service function

TBD — see §3 Phase 1 (bootstrap: will establish runner config, test DB setup, and a reference test for the invitation send flow).

### 6.2 Adding an integration test for an RLS policy

TBD — see §3 Phase 2 (security layer: will establish the pattern for authenticating as a test user and asserting cross-user access is blocked).

### 6.3 Adding an integration test for the invitation state machine

TBD — see §3 Phase 1 (covers the pending→accepted→meetings-visible transition; reference test will live in the Phase 1 change folder).

### 6.4 Adding an e2e test

TBD — see §3 Phase 1 (if the invitation flow requires a full browser + cookie session, the e2e pattern will be established there using the existing Playwright dependency).

### 6.5 Adding a test for a new feature in the breeding track

TBD — see §3 Phase 3 (activates when S-06..S-08 lands; will cover the breed-filter + breeding-flag pattern).

### 6.6 Per-rollout-phase notes

(Filled in as phases ship — captures surprises, fixture locations, and anything a future test author needs that isn't obvious from the cookbook entries above.)

---

## 7. What We Deliberately Don't Test

- **Admin tooling** — none exists in this app; no test budget allocated here. Re-evaluate if an admin role is added post-MVP. (Source: Phase 2 interview Q5.)
- **High-impact / low-likelihood infrastructure failures** — cloud-provider outages (Supabase down, Cloudflare Workers down) belong to observability and alerting, not the test suite. (Source: §1 cost × signal principle.)
- **UI pixel details and layout** — visual regression on marketing-style pages; not a risk the product depends on. (Source: §1 cost × signal principle; no evidence in PRD or interview.)

---

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-28
- Stack versions last verified: 2026-09-28
- AI-native tool references last verified: 2026-09-28 (none recommended)

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
