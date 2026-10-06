---
project: pawmeet
plan_for: first-production-deploy
platform: Cloudflare Workers
approach: manual wrangler deploy (reviewed first cutover)
approved_at: 2026-09-21
source_contracts:
  - context/foundation/infrastructure.md
  - context/foundation/tech-stack.md
---

# First Deployment Plan — PawMeet → Cloudflare Workers

## Context

PawMeet's foundation chain is complete: `prd.md` (what), `tech-stack.md` (10x Astro Starter, Cloudflare-native), and `infrastructure.md` (decision: **Cloudflare Workers**, 5/5 criteria, zero adapter migration). This document is the reviewed human gate before the first production cutover — the audit trail of "what was supposed to happen."

Exploration confirmed the scaffold is genuinely Workers-shaped, resolving the single biggest risk from `infrastructure.md` (the Pages-vs-Workers trap): `wrangler.jsonc` declares `main` + `assets` binding + `nodejs_compat`, with **no** `pages_build_output_dir`. Deploy is `npx wrangler deploy` (wrangler v4.131.1 is a devDependency; there is no custom `deploy` script).

**Chosen approach:** manual `wrangler deploy` for a reviewed first cutover · Worker renamed to `pawmeet` · light checks on prod, full auth smoke run locally against local Supabase.

## Ground truth (from exploration)

| Fact | Value | Source |
|---|---|---|
| Target | Cloudflare **Workers** (not Pages) | `wrangler.jsonc`: `main`, `assets`, `nodejs_compat`; no `pages_build_output_dir` |
| Worker name | **`pawmeet`** (renamed from `10x-astro-starter`) | `wrangler.jsonc` `"name"` |
| Deploy cmd | `npx wrangler deploy` (no `deploy` npm script) | `package.json` scripts |
| Runtime env | `astro:env/server` reads `SUPABASE_URL`/`SUPABASE_KEY`, both `optional` | `astro.config.mjs`, `src/lib/supabase.ts` |
| Secrets in prod | come from **Cloudflare Worker secrets**, NOT `.env` | Astro `access:"secret"` + Cloudflare adapter |
| Hosted Supabase | already exists (`.env`, gitignored; anon `sb_publishable_` key) | `.env` |
| DB migrations | **none** (`supabase/migrations/` absent, `schema_paths = []`) | `supabase/config.toml` |
| Auth flow deps | uses Supabase built-in `auth` schema only → no app tables needed to deploy/verify | `src/pages/api/auth/*`, `scripts/smoke.mjs` |
| CI | was on `master`; default branch is `main` → **fixed to `main`** | `.github/workflows/ci.yml` |
| Node | 22.14.0 | `.nvmrc` |

## Pre-flight fixes (the "braki") — DONE

1. **`wrangler.jsonc`** — `"name": "10x-astro-starter"` → `"name": "pawmeet"`. Sets the production URL to `pawmeet.<subdomain>.workers.dev`.
2. **`.github/workflows/ci.yml`** — `branches: [master]` → `branches: [main]` (push + pull_request) so CI (lint + build + smoke) actually runs.

## Human-only gates (per infrastructure.md minimal-permissions posture)

- **Cloudflare auth:** `npx wrangler login` (interactive browser OAuth — run in-session as `! npx wrangler login`). For CI later, use a **Workers-scoped** API token for this project only — no DNS, no billing, no unrelated secrets.
- **Supabase dashboard** (Auth → URL Configuration): add the production origin to the redirect allowlist and site URL:
  - Site URL / redirect: `https://pawmeet.<subdomain>.workers.dev`
  - Without this, email-confirmation links bounce on the deployed origin.

## Deploy runbook (manual, agent-executed after login)

1. `npm ci` — clean install (wrangler + adapter, Node 22).
2. `npm run build` — `astro build` → `./dist` (served via the `ASSETS` binding). Succeeds with no secrets because the env vars are `optional`.
3. `npx wrangler deploy` — creates the `pawmeet` Worker and activates it, returning `https://pawmeet.<subdomain>.workers.dev`. The app boots **unconfigured** here (secrets not yet set) — expected.
4. **Set production secrets** (values from the gitignored `.env`; apply to the live Worker immediately):
   - `npx wrangler secret put SUPABASE_URL`
   - `npx wrangler secret put SUPABASE_KEY`
   - Verify: `npx wrangler secret list` shows both.
5. **Complete the Supabase dashboard redirect-URL gate** above.
6. Keep rollback ready: `npx wrangler rollback` reverts to the prior version in seconds (code only).

## Verification

**Production (light checks — safe, no Supabase pollution; these paths don't require auth to be configured):**
- `GET https://pawmeet.<subdomain>.workers.dev/` → **200** (home renders; after secrets, the config-status panel should report *configured*).
- `GET https://pawmeet.<subdomain>.workers.dev/dashboard` (unauthenticated) → **302** → `/auth/signin` (`src/middleware.ts` `PROTECTED_ROUTES = ["/dashboard"]`).

**Full auth flow (run locally, against local Supabase — mirrors the CI smoke job so the live Supabase `auth` table isn't polluted):**
- `npx supabase start` → export local `API_URL`/`ANON_KEY` into `.env` → `npm run build` → `npm run preview` → `BASE_URL=http://localhost:4321 npm run smoke` (8-step signup→signin→signout→protection flow in `scripts/smoke.mjs`).

Deployment is successful when both production light checks pass and the local smoke run is green.

## Applicable risks carried from infrastructure.md

- **Secrets are per-Worker, not `.env`** — if the app reads "unconfigured" in prod, the `wrangler secret put` step was skipped. Confirm with `wrangler secret list`.
- **Preview/prod share the one hosted Supabase** — a reason the full auth smoke stays local.
- **Rollback reverts code, not DB migrations** — irrelevant for this first deploy (no migrations), true once PawMeet tables land.
- **Node built-ins at the edge** — `nodejs_compat` is enabled; watch new transitive deps that reach beyond it (fails only in prod, not `astro dev`).

## Out of scope (follow-ups, not this deploy)

- **PawMeet domain schema** — create `supabase/migrations/…_init.sql` for profiles/dogs/meetups with per-operation, per-role **RLS** (PRD guardrail: profiles visible only to logged-in users).
- **CI secrets** — add `SUPABASE_URL`/`SUPABASE_KEY` as GitHub repo secrets so the now-on-`main` workflow's build step passes.
- **Auth hardening for prod** — password min length (currently 6) and email-confirmation policy in the hosted project.
- **CI/CD auto-deploy on merge** — deferred; wire after the first manual cutover is proven.

## Deployment record (executed 2026-09-21)

First deploy completed successfully.

| Item | Value |
|---|---|
| Live URL | https://pawmeet.majerskiluk.workers.dev |
| Cloudflare account | majerskiluk@gmail.com (`fc450a12403cef0b5268e3f6c0d4cfba`) |
| Version ID | `abf4f9d8-e935-4cf0-8646-e56ae0879a11` |
| Worker name | `pawmeet` |
| Auto-provisioned | KV namespace `pawmeet-session` (id `9cd17a734a474211bea80938cda3cdfa`, bound as `SESSION`); `IMAGES` + `ASSETS` bindings active |
| Secrets set | `SUPABASE_URL`, `SUPABASE_KEY` (confirmed via `wrangler secret list`) |

**Verification results:**
- `GET /` → **200** ✓
- `GET /dashboard` (no auth) → **302 → /auth/signin** ✓
- Home page shows **no** "nie jest skonfigurowany" banner → Supabase **configured** ✓

**Still pending (human):**
- Add `https://pawmeet.majerskiluk.workers.dev` to the Supabase project's Auth → URL Configuration (Site URL + redirect allowlist). Until then, email-confirmation / post-auth redirects may bounce.
- Optional: run the full local auth smoke (`npx supabase start` + `npm run smoke`) against local Supabase to exercise signup/signin/signout end-to-end without touching the live `auth` table.

**Uncommitted changes from this deploy:** `wrangler.jsonc` (name → `pawmeet`) and `.github/workflows/ci.yml` (branch `master` → `main`). Commit when ready.
