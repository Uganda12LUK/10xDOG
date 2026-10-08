---
project: pawmeet
researched_at: 2026-09-21
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7 (SSR) + React 19
  runtime: Cloudflare workerd
---

## Recommendation

**Deploy on Cloudflare Workers.**

PawMeet's 10x Astro Starter is already Cloudflare-native — `@astrojs/cloudflare` adapter, `output: "server"`, workerd runtime, `@supabase/ssr` cookie sessions. Choosing Cloudflare means **zero adapter migration**: the deploy target matches the tested shape of the code. It scores 5/5 on the agent-friendly criteria (mature `wrangler` CLI, fully managed serverless, `llms.txt` + GitHub-hosted markdown docs, deterministic `wrangler deploy`/`wrangler rollback`, and a **GA** official Cloudflare MCP server). The interview answers reinforce rather than override this: no prior platform familiarity (no tiebreak elsewhere), single-region and Supabase-external (both neutral-to-favorable for edge), and a cost≈DX balance that the $0–$5/mo Workers tier satisfies.

## Platform Comparison

Scored Pass / Partial / Fail against the five agent-friendly criteria. Hard filter: the stack is Astro/TypeScript on the Cloudflare adapter; all six candidates *can* host Astro via adapters, so none was dropped on runtime. Persistent-connection filter was not applied as a hard drop because the PRD marks realtime/background jobs out of scope (interview answer was "don't know" — carried into the risk register instead).

| Platform | CLI-first | Managed/Serverless | Agent docs | Stable deploy API | MCP/integration | Total |
|---|---|---|---|---|---|---|
| **Cloudflare Workers** | Pass | Pass | Pass | Pass | Pass | **5 / 5** |
| Vercel | Pass | Pass | Pass | Pass | Partial | 4.5 |
| Netlify | Pass | Pass | Pass | Pass | Pass | 4.5* |
| Fly.io | Pass | Partial | Pass | Pass | Fail | 3 |
| Railway | Pass | Pass | Partial | Partial | Fail | 2.5 |
| Render | Partial | Pass | Partial | Partial | Fail | 2 |

Per-platform notes:
- **Cloudflare Workers** — `wrangler` covers deploy, rollback, secrets, and `wrangler tail` logs unattended. Fully managed edge serverless (no OS/TLS/routing to misconfigure). Docs published as `llms.txt`/`llms-full.txt` and markdown on GitHub. `wrangler deploy` + `wrangler rollback <version-id>` are deterministic. Official Cloudflare MCP servers (docs, Workers, observability) are GA. Only weakness is the edge-runtime constraint set (see cross-check), not the criteria.
- **Vercel** — Smoothest DX and the most mature Astro SSR adapter with image optimization; fastest cold starts. MCP is **public beta, read-only** (mcp.vercel.com, OAuth) as of 2026-09 — a real but soft signal. Costs a one-line adapter swap away from the starter's native target.
- **Netlify** — Official MCP (9 consolidated tools, `selectSchema`-based) and a solid `netlify` CLI (draft deploys by default; `--prod` required — a safe agent default). Weakest SSR performance of the three and, like Vercel, requires an adapter swap. *Total marked with asterisk: ties Vercel on criteria but ranks third because its SSR performance gap matters more for this stack than Vercel's beta-MCP gap.
- **Fly.io** — Strong `flyctl`, real persistent-process support (would matter if the "don't know" on connections becomes "yes"), MDX docs on GitHub. But container/VM model is more operational surface than MVP needs, no MCP, and the free tier is gone (pure pay-as-you-go).
- **Railway** — Good DX, but no free tier (one-time ~$5 trial credit), weaker agent-docs story, and no MCP. Deploy via API rather than a first-class one-command CLI flow.
- **Render** — Retains a real free tier, but free web services spin down after ~15 min and cold-start ~1 min. CLI is thinner (deploy hooks + API), no MCP. Fine for a hobby static site, weak for agent-driven SSR ops.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Native to the starter — no migration, no re-testing of the Supabase SSR cookie path against a new adapter. 5/5 on the criteria with a GA MCP server and a CLI that closes the full operational loop (deploy → tail → rollback) without a browser. Cheapest credible path to a first deploy for a solo after-hours builder: free tier for the static shell, $5/mo Workers Paid when SSR volume or observability warrants it.

#### 2. Vercel

The strongest pure-DX option and the most battle-tested Astro SSR adapter, with the fastest cold starts. It loses to Cloudflare on two counts for *this* project: it requires swapping away from the starter's native adapter (re-validating auth/session behavior), and its MCP is still beta and read-only. If Cloudflare's edge-runtime constraints ever become a genuine blocker, Vercel is the clean fallback (adapter swap is ~15 minutes).

#### 3. Netlify

Comparable criteria score to Vercel, with a mature official MCP and agent-safe draft-by-default deploys. Ranks third because its SSR performance trails both leaders and it, too, needs an adapter swap — so it carries Vercel's migration cost without Vercel's DX/performance edge.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **Node API gaps at the edge.** workerd is a V8 isolate, not Node — no `fs`, no `child_process`, partial `node:crypto`. A Supabase or image transitive dependency reaching for a Node built-in fails only in production, not in local `astro dev`.
2. **CPU-time ceiling on image uploads.** FR-002/FR-003 (owner/dog image uploads): heavy in-Worker image processing can trip Workers' CPU limits. Transforms belong in Supabase Storage / an image service, not the Worker.
3. **Pages-vs-Workers command trap.** The tech-stack hint says `cloudflare-pages`, but the code (CLAUDE.md, `@astrojs/cloudflare`) targets Workers. `wrangler pages deploy` and `wrangler deploy` are not interchangeable — following the wrong tutorial silently misconfigures the deploy.
4. **No long-lived connections without Durable Objects.** The "don't know" on persistent connections is a live risk: plain Workers can't hold WebSockets. A future presence/notification feature would require Durable Objects — a separate paid primitive and mental model.
5. **Supabase SSR cookie edge cases.** `@supabase/ssr` cookie handling on Workers depends on how the adapter exposes `request`/`platform`; auth bugs here surface as intermittent logged-out states that are hard to reproduce locally.

### Pre-Mortem — How This Could Fail

The MVP shipped in three weeks and demoed cleanly. Trouble started when PawMeet added meetup notifications: the solo builder assumed "Cloudflare does realtime," wired a WebSocket, then discovered plain Workers can't hold connections — Durable Objects meant relearning state, alarms, and a new billing line, after hours. Meanwhile image uploads, prototyped with small files, hit CPU limits once users posted multi-megabyte dog photos; transforms had to be ripped out of the Worker and moved to Supabase. A routine dependency bump pulled in a library using `node:fs`; it passed `astro dev` and broke only in production as a generic Worker exception, costing an evening of blind debugging. Each issue was individually small, but each landed on a builder with zero prior Cloudflare experience, at night, with no colleague to ask. The platform wasn't wrong — the underestimated risk was the learning curve of edge-runtime constraints on someone starting from zero familiarity.

### Unknown Unknowns

- **`astro dev` already emulates the Workers runtime** via the adapter's Vite/`platformProxy` integration — a separate `wrangler pages dev` step is legacy. The real local gotcha is the `CLAUDECODE` 30s dev-watchdog noted in CLAUDE.md, not a missing wrangler command.
- **Confirm Workers vs Pages before first deploy.** Cloudflare now recommends Workers for new projects (Workers serve static assets directly). Verify what `astro.config.mjs` + `wrangler.jsonc` actually declare — mixing the two is the most common Cloudflare-Astro failure.
- **Preview-URL auth.** Supabase auth redirect URLs must whitelist `*.workers.dev` preview domains, or email-confirmation links bounce on preview deploys.
- **Free-plan observability is shallow.** Beyond `wrangler tail`, real log retention/analytics nudges you to the $5/mo Workers Paid plan sooner than "free tier" marketing implies.
- **Secrets are per-Worker, not `.env`.** Production secrets are set via `wrangler secret put` and do not come from `.env` at runtime; `.dev.vars` is local-only. Forgetting this yields an app that boots "unconfigured" in prod despite working locally.

## Operational Story

- **Preview deploys**: `wrangler versions upload` produces a preview version with a unique `*.workers.dev` preview URL; the GitHub integration auto-generates a preview per PR when the deploy command is `npx wrangler deploy`. Whitelist the preview domain in Supabase Auth redirect URLs or confirmation links bounce. Fork PRs do not receive secrets by default.
- **Secrets**: Production secrets (`SUPABASE_URL`, `SUPABASE_KEY`) live in Workers Secrets, set via `wrangler secret put SUPABASE_KEY`; readable only to the account/token, never printed back. Local dev reads `.dev.vars` (gitignored). Rotate by re-running `wrangler secret put` — takes effect on next deploy. GitHub Actions build needs the same values as repo secrets.
- **Rollback**: `wrangler rollback [<version-id>]` immediately re-activates a prior version across all routes; typical time-to-revert is seconds. Caveat: rollback reverts code only — Supabase schema migrations do **not** roll back automatically, so a deploy that shipped a migration needs a manual down-migration.
- **Approval**: An agent may deploy previews, tail logs, and roll back unattended. Human-only actions: publishing to the production domain (first cutover), rotating the primary Supabase key, running/rolling back DB migrations, and any Durable Objects / billing-tier change. Scope the Cloudflare API token to Workers for this one project — no DNS, no unrelated secrets, no billing.
- **Logs**: `wrangler tail` streams live runtime logs (read-only); `wrangler deployments list` shows deploy history; the Cloudflare observability MCP server exposes the same read-only surface as structured tools when the agent needs to query state repeatedly.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Node built-in (`fs`/`child_process`) pulled in by a dependency, breaks only in prod | Devil's advocate | M | H | Keep `nodejs_compat` flag awareness; test deploys on a preview before prod; pin dependencies and review new transitive deps against workerd support. |
| In-Worker image processing trips CPU limit (FR-002/003) | Devil's advocate | M | M | Offload image storage/transforms to Supabase Storage or an image CDN; never process large images inside the Worker. |
| Pages-vs-Workers command mismatch misconfigures deploy | Devil's advocate / Unknown unknowns | M | H | Confirm `astro.config.mjs` + `wrangler.jsonc` declare Workers; standardize on `wrangler deploy` (not `wrangler pages deploy`) in scripts and docs. |
| Future realtime/notifications need connections plain Workers can't hold | Pre-mortem | L | H | Treat realtime as out-of-MVP (per PRD); if needed, scope Durable Objects as a deliberate follow-up, not an inline hack. |
| Supabase SSR cookie/session bugs on the edge (intermittent logout) | Devil's advocate | M | M | Keep `@supabase/ssr` and adapter versions pinned; run the `npm run smoke` auth-flow test against a preview after any auth/adapter change. |
| Preview-URL auth redirects bounce confirmation emails | Unknown unknowns | M | M | Add `*.workers.dev` (and the prod domain) to Supabase Auth redirect allowlist before first preview test. |
| Prod boots "unconfigured" because secrets weren't set via `wrangler secret put` | Unknown unknowns | M | M | Document the `wrangler secret put` step in the deploy runbook; verify with `wrangler secret list` before cutover. |
| Rollback reverts code but not DB migrations | Research finding | L | H | Gate migrations behind human approval; keep reversible down-migrations; never bundle a schema change with a routine code deploy without a rollback plan. |
| Free-tier observability too shallow to debug prod incidents | Unknown unknowns | M | L | Budget for the $5/mo Workers Paid plan once real traffic arrives; rely on `wrangler tail` for MVP. |

## Getting Started

Validated against the pinned stack (`@astrojs/cloudflare` on Workers, Node v22.14.0 per `.nvmrc`) — not generic platform docs:

1. **Confirm the target is Workers, not Pages.** Open `astro.config.mjs` (expect `adapter: cloudflare(...)`) and `wrangler.jsonc`/`wrangler.toml`; standardize deploy on `wrangler deploy`. Do not follow Pages tutorials.
2. **Authenticate wrangler**: `npx wrangler login` (interactive — run it yourself via `! npx wrangler login` in the session). For CI, use a Workers-scoped API token, not the global key.
3. **Set production secrets**: `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`. Keep local values in `.dev.vars` (gitignored). Add `*.workers.dev` + prod domain to Supabase Auth redirect URLs.
4. **Local dev with runtime fidelity**: `npm run dev` (the adapter's `platformProxy` emulates workerd — no separate `wrangler pages dev` needed). Note the `CLAUDECODE` 30s dev-watchdog gotcha in CLAUDE.md when running under an agent.
5. **First deploy to a preview, then promote**: `npx wrangler versions upload` → verify the preview URL and run `npm run smoke` against it → `npx wrangler deploy` to go live. Keep `npx wrangler rollback` ready.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (note: the existing `.github/workflows/ci.yml` triggers on `master` while the default branch is `main` — a known gotcha to fix separately)
- Production-scale architecture (multi-region, HA, DR)
