# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**PawMeet** — a web app for dog owners to socialize their dogs (walk meetups) and find breeding partners. Scaffolded from the 10x Astro Starter. Product context lives in `context/foundation/`:

- `context/foundation/prd.md` — product requirements (features, user stories, business rules). Source of truth for *what* to build; note it also covers a breeding-partner flow not yet in `shape-notes.md`.
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

> **Gotcha**: the workflow triggers on `master`, but this repo's default branch is `main` — so CI does not currently run. Fix by updating the `branches:` filter in `ci.yml` to `main` (or renaming the branch).

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

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 3, Lesson 4 (E2E Tests)

**For E2E tests, use the two M3L4 skills in this order:**

1. **`/10x-e2e-setup`** — one-time setup: Playwright config (`webServer`,
   auth `setup` project, `storageState`), a green seed test, and `context/foundation/test-stack.md`.
2. **`/10x-e2e`** — the per-risk loop: risk → explore the running app with
   `playwright-cli` → generate → review against the five anti-patterns →
   re-prompt by name → verify with a deliberate break.

The skills' `references/` carry the full rules, anti-patterns, seed pattern, and
prompt-template.

A few hard rules that hold even before you invoke the skill:

- **Locators:** `getByRole` / `getByLabel` / `getByText` first; `getByTestId`
  only when accessibility attributes are ambiguous. Never CSS selectors, XPath,
  or DOM structure.
- **Never `page.waitForTimeout()`.** Wait for state: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Test independence + cleanup.** Each test runs standalone — its own setup,
  action, assertion, and cleanup; unique ids (timestamp suffix) so parallel runs
  and re-runs don't collide.

Two boundaries to keep straight:

- **DOM (snapshot) is the default.** Vision (`--caps=vision`) is a supplement for
  visual-only risks (layout, z-index, animation); for pixel regression prefer
  deterministic tools (`toHaveScreenshot`, Argos, Lost Pixel). VLM model
  selection/cost is a debugging topic (Lesson 5), not testing.
- **A red test is a signal, not a chore.** A changed selector → update the
  locator in a reviewed diff. A changed business behavior → the test caught a
  bug; never edit the assertion to match it. Fixing failing tests is Lesson 5.

<!-- END @przeprogramowani/10x-cli -->
