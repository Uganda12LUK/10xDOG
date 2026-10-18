# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**PawMeet** — a web app for dog owners to arrange dog walks together and build dog groups (packs). Planned next: dog-friendly places and interesting walk spots. Breeding-partner matching is a far-future idea — only a `type='breeding'` scaffold exists in code, no flow. Scaffolded from the 10x Astro Starter. Product context lives in `context/foundation/`:

- `context/foundation/prd-v2.md` — **current** product requirements (features, user stories, business rules). Source of truth for *what* to build: walk socialization core + dog groups (pack); breeding is a far-future direction only. `context/foundation/prd.md` is the **superseded v1** (breeding-as-must-have era), kept as decision history.
- `context/foundation/tech-stack.md` — the stack decision and rationale.
- `context/changes/bootstrap-verification/verification.md` — the scaffold's audit trail.
- `CLAUDE.course.md` — the 10xDevs lesson toolkit instructions (the `/10x-*` skill chain). Kept for reference; not auto-loaded.

## Commands

- `npm run dev` — start dev server (Cloudflare workerd runtime)
- `npm run build` — production build (SSR via `@astrojs/cloudflare`)
- `npm run preview` — preview production build
- `npm run lint` — ESLint with type-checked rules
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier (includes prettier-plugin-astro + prettier-plugin-tailwindcss)
- `npm run smoke` — dependency-free auth-flow smoke test (`scripts/smoke.mjs`) against a running server, `BASE_URL` env (default `http://localhost:4321`). Run after dependency upgrades; CI runs it against the production preview with a local Supabase.

Pre-commit hooks: husky + lint-staged runs `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

## Architecture

**Astro 7 SSR app** with React 19 islands, Tailwind 4, Supabase auth, and shadcn/ui components. Deployed to Cloudflare Workers.

### Rendering mode

Full server-side rendering (`output: "server"` in astro.config.mjs). All pages are server-rendered by default. API routes must export `const prerender = false`.

### Auth flow

- `src/lib/supabase.ts` — creates a Supabase SSR client using `@supabase/ssr` with cookie-based sessions. Uses `astro:env/server` for `SUPABASE_URL` and `SUPABASE_KEY` (server-only secrets declared in astro.config.mjs `env.schema`).
- `src/middleware.ts` — runs on every request, resolves the current user, attaches to `context.locals.user`. Redirects unauthenticated users away from routes listed in `PROTECTED_ROUTES`.
- API endpoints: `src/pages/api/auth/{signin,signup,signout}.ts`
- Auth pages: `src/pages/auth/{signin,signup,confirm-email}.astro`
- Protected page example: `src/pages/dashboard.astro`

### Key conventions

- **Path alias**: `@/*` maps to `./src/*` (tsconfig paths).
- **Astro components** for static content/layout; **React components** only when interactivity is needed.
- **Tailwind class merging**: use the `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional/merged class names. Do not concatenate class strings manually.
- **shadcn/ui**: components live in `src/components/ui/`, "new-york" style variant. Install new ones with `npx shadcn@latest add [name]`.
- **API routes**: use uppercase `GET`, `POST` exports; validate input with zod.
- **Supabase migrations**: `supabase/migrations/` using naming format `YYYYMMDDHHmmss_short_description.sql`. Always enable RLS on new tables with granular per-operation, per-role policies. (The PRD guardrail requires profiles to be visible only to logged-in users — enforce this with RLS early.)
- **React**: no Next.js directives ("use client" etc.). Extract hooks to `src/components/hooks/`.
- **Services/helpers** go in `src/lib/` (or `src/lib/services/` for extracted business logic).
- **Shared types** (entities, DTOs) go in `src/types.ts`.

### Environment

- **Node.js v22.14.0** (see `.nvmrc`). Use this exact version — the dev server has a 30s startup watchdog that can fail on newer majors (observed failing on Node 24).
- Env vars: `SUPABASE_URL`, `SUPABASE_KEY` (copy `.env.example` to `.env` for Node, or `.dev.vars` for Cloudflare local dev). Both are declared `optional` in the env schema, so the app boots without them and reports an unconfigured state.
- Local Supabase: `npx supabase start` (requires Docker)
- Cloudflare local dev: secrets go in `.dev.vars` (gitignored)
- Deploy: `npx wrangler deploy` (requires Cloudflare account + `wrangler` auth)

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint + build on every push and PR. Requires `SUPABASE_URL` and `SUPABASE_KEY` repository secrets for the build step.

The active workflow triggers on `main` (both `push` and `pull_request`), so CI runs on every push and PR against the default branch. (The original 10x scaffold template `ci.yml.scaffold` historically targeted `master`; the active `ci.yml` — and the template — are on `main`.)

## UI conventions (design-system contract)

- **Tokens are the only color source.** Semantic tokens live in `src/styles/global.css`
  (`:root` / `.dark` hold values; `@theme inline` publishes them as `--color-*`). Use role
  classes (`bg-primary`, `text-muted-foreground`) — **never** color literals (hex/rgb or Tailwind
  palette classes like `bg-blue-600`) in views or markers. This includes Leaflet `divIcon` HTML and
  SVG markers: reference `var(--color-primary)` / `var(--color-primary-foreground)` (proven to
  resolve inside divIcon).
- **Shared components** live in `src/components/ui/` (shadcn, new-york). Check there before building
  a primitive; add new ones with `npx shadcn@latest add [name]`. Extract hooks to
  `src/components/hooks/` (e.g. `useMediaQuery`).
- **Desktop layout is required, not optional.** Views must adapt at `lg:` — do not ship a
  phone-width column on desktop. Map views (`/map`, `/meetings/new`) use a two-pane/`lg:grid`
  layout; a map pane must have a **definite height** (`lg:h-[calc(100svh-…)]` or a fixed `lg:h-[…]`),
  because Leaflet reads its size once at mount and has no `invalidateSize()` call — an auto-height
  pane renders a grey box. Switch responsive-only component props (e.g. shadcn `Sheet` `side`) with
  `useMediaQuery`, not CSS.
- **Reuse `buttonVariants` / `badgeVariants` in `.astro`.** For static `<a>`/`<button>`/`<span>` that
  need button/badge styling without React hydration, import the cva from `@/components/ui/{button,badge}`
  and apply it via `class:list` (not `class={…}`, which trips `astro/prefer-class-list-directive`). Do
  not hand-roll a second button.
- **Visual gate = dev-only kitchen sink.** Prove a view's state matrix on a backend-free page guarded by
  `import.meta.env.DEV` (404 in prod), rendering the presentational component from fixtures. Example:
  `src/pages/dev/owner-profile-kitchen-sink.astro` drives `src/components/owners/OwnerProfile.astro`
  across default / pending / error / empty. Screenshot it at desktop + mobile instead of needing live data.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 4, Lesson 2 (Project Map)

Get up to speed in an unfamiliar or legacy repo from evidence, not from directory trees: **Wide Scan first, Deep Focus later.**

```
git history + dependency graph + contributors -> context/map/repo-map.md -> focused /10x-research
```

### Task Router - Where to start

| Skill / prompt | Use it when |
| --- | --- |
| `/10x-repo-map` | One-run Project Map. It ranks business capabilities by criticality × buzz, keeps its evidence in `context/map/evidence/`, and writes `context/map/repo-map.md` with risk zones, a first-day reading list and explicit unknowns. Use `--replace` to refresh; the previous run moves to `context/archive/`. |
| `m4l2-1-territory-git-history` -> `m4l2-2-structure-dependency-cruiser` -> `m4l2-3-contributors-git` -> `m4l2-repo-map-synthesis` | The same map built step by step, one artifact at a time, so you can see what each evidence source adds. |
| `/10x-research` | A question about one feature or area. The map covers breadth and takes no target; depth belongs to research. |

### Hard rules

- **Let tools collect evidence outside the context window.** Use git, the forge and graph tools to gather data, then interpret only their condensed output. Never read the repo file by file.
- **Exclude the noise.** Leave out lockfiles, generated code, bulk formatting commits, bot commits and agent-authored commits when ranking activity.
- **Unknowns are part of the map.** Mark what the evidence can't show as unknown instead of filling the gap with a guess.

<!-- END @przeprogramowani/10x-cli -->
