# Repository Guidelines

PawMeet is an Astro 7 SSR web app (React 19 islands, Tailwind 4, Supabase auth, shadcn/ui) deployed to Cloudflare Workers. `@CLAUDE.md` is the authoritative guide — read it for full detail; this file is the quick agent onboarding.

## Hard rules

- **Node 22.14.0 exactly** (`.nvmrc`). The dev server has a 30s startup watchdog that fails on newer majors (observed on Node 24).
- **Enable RLS on every new table** with granular per-operation, per-role policies. Profiles must be visible only to logged-in users — enforce via RLS, not app code.
- **API routes must export `const prerender = false`** — the app is full SSR (`output: "server"`).
- **Merge Tailwind classes with `cn()`** from `@/lib/utils`; never concatenate class strings manually.
- **No Next.js directives** (`"use client"` etc.) in React components.

## Build, Test & Development Commands

- `npm run dev` — dev server (Cloudflare workerd runtime).
- `npm run build` / `npm run preview` — production build / preview.
- `npm run lint` / `npm run lint:fix` — ESLint with type-checked rules.
- `npm run format` — Prettier (astro + tailwindcss plugins).
- `npm run smoke` — dependency-free auth-flow check against a running server (`BASE_URL`, default `http://localhost:4321`). Run after dependency upgrades.

## Project Structure

Source in `src/`: `pages/` (routes + `pages/api/`), `components/` (`components/ui/` for shadcn), `layouts/`, `lib/` (services/helpers; `lib/services/` for extracted logic), `middleware.ts`, `styles/`. Shared types go in `src/types.ts`. Supabase migrations in `supabase/migrations/` named `YYYYMMDDHHmmss_short_description.sql`.

## Coding Style & Naming

- Path alias `@/*` → `./src/*`. Astro components for static/layout; React only where interactivity is needed; extract hooks to `src/components/hooks/`.
- Add shadcn/ui components with `npx shadcn@latest add <name>` ("new-york" variant).
- API routes: uppercase `GET`/`POST` exports; validate input with zod.

## Commit & PR Guidelines

Commit convention not yet established (history is scaffold-only) — use short imperative subjects. Pre-commit hooks (husky + lint-staged) run `eslint --fix` and `prettier --write`. CI runs lint + build; note the workflow triggers on `master` while the default branch is `main`, so CI currently does not run — see `@CLAUDE.md`.

## Security & Configuration

`SUPABASE_URL` / `SUPABASE_KEY` are server-only secrets (`.env` for Node, `.dev.vars` for Cloudflare, both gitignored). Local Supabase: `npx supabase start` (Docker).
