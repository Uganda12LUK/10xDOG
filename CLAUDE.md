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

## 10xDevs AI Toolkit - Module 3, Lesson 5 (Debugging)

Turn a failure into a fix the agent can defend: evidence first, then a failing test, then the fix.

```
signal (monitoring | log | flaky E2E | stack trace) -> gather evidence -> reproduce -> failing test -> fix -> verify
```

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| `/10x-frame` | The report arrives as "bug + proposed fix". Check that the observed symptom and the stated cause actually match before anyone fixes anything. |
| `/10x-new` -> `/10x-research` -> `/10x-plan` -> `/10x-implement` | The fix is more than a one-liner. Research collects the evidence; the plan starts with the failing regression test. |
| `/10x-tdd` | Writing the regression test that reproduces the bug before the fix. |
| `/10x-e2e` | The bug only shows up in the running app. Reproduce it in the browser and keep that test. |
| `/10x-observability-audit` | Errors are missing, noisy or impossible to diagnose in production. It audits the critical flows for code that hides failures and writes a dated report under `context/audits/observability/`. Use `--verify <report>` to re-check an earlier report after fixes. |

### Hard rules

- **Evidence before a hypothesis.** Use what the error tracker, the logs, a reproduction and the code each show. Never guess a cause from the stack trace alone.
- **The bug becomes a failing test first.** The fix is done when that test goes from red to green and stays in the suite.
- **Never hide the evidence.** No empty `catch`, no ignored promise rejections, no failures turned into redirects or `200`s, no dropped error causes. If the fix needs a `catch`, it logs or reports the error with its cause.
- **Fix the cause, not the test.** Don't edit an assertion to match the new behaviour unless the requirement itself changed.

### Lesson boundaries

- `/10x-observability-audit` reads code and writes a report. It never changes the audited code. Fixing what it finds goes through the change chain.
- Choosing a monitoring vendor is `/10x-infra-research`, not this lesson.

<!-- END @przeprogramowani/10x-cli -->
