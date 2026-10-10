---
type: observability-audit
date: 2026-10-09 20:35
mode: audit
commit: f3188b6
branch: feat/discovery-location-tweaks
dirty_tree: true
areas: [walk-invitation-loop]
area_source: user
runtime_proof: not-run
error_tracker: none (no Sentry/Datadog/Rollbar/OTel SDK in repo; console.* only)
previous_report: null
findings: { critical: 1, high: 1, medium: 1, low: 0 }
---

# Observability audit — walk-invitation-loop (2026-10-09)

## 1. TL;DR

- **No error tracker is wired in code at all.** The only monitoring boundary
  is `console.*`, which on Cloudflare Workers lands in the platform log
  stream. So every "report the error" expectation collapses to "did the code
  at least `console.error` the cause?" — and in the invitation flow it does
  not.
- **Root cause A — failure flattened into a redirect.** `POST /api/invitations`
  turns *any* `sendInvitation` failure (RLS denial, duplicate-pending unique
  violation, FK, DB outage) into a **302 redirect** to the form with a generic
  `?error=`. To monitoring that is a 3xx = success. An on-call engineer sees
  nothing. (`src/pages/api/invitations/index.ts:70`)
- **Root cause B — empty `catch` drops the cause.** Both invitation routes use
  `catch { … }` with no binding, so the `Error(result.error.message)` thrown by
  the service (`src/lib/services/invitation.ts:70`) — the only thing that says
  *why* — is discarded. Nothing is logged, nothing is reported.
- **Consequence:** if the invitations table/RLS breaks in production, senders
  silently get "Something went wrong. Please try again." forever, responders
  get an opaque 500, and there is **zero** signal (no 5xx on send, no log line,
  no tracker event) telling anyone the north-star flow is down.

## 2. Capture model

- **Runtime/platform:** Astro SSR (`output: "server"`) on Cloudflare Workers
  via `@astrojs/cloudflare` (`astro.config.mjs:11,16`). Long-lived worker;
  API routes are `prerender = false` handlers.
- **Error tracker:** **none in repo.** Repo-wide grep for
  `sentry|datadog|rollbar|bugsnag|newrelic|opentelemetry` → 0 hits in `src/`.
- **Logging:** ad-hoc `console.*` only. In the invitation flow there are **no**
  `console.error` calls on the failure paths.
- **Capture boundary:** none. There is no global error wrapper/middleware for
  API routes; each route hand-rolls its own try/catch. `src/middleware.ts`
  handles auth/locale only and does not wrap route errors or report them.
- **Deploy identity / scrubbing / sampling:** not present in repo.

**Assumptions (outside the repo, not findings):** Cloudflare collects worker
`console` output into the platform log stream (standard Workers behavior) —
*unconfirmed by user*. Whether any alert is built on those logs is a dashboard
concern and outside this audit.

## 3. What reaches the tracker

Static-only (no runtime probe run this pass):

| Failure shape | Response today | Platform logs | Tracker | Verdict |
|---|---|---|---|---|
| `sendInvitation` throws (send) | **302 → /meetings/new?error=…** | nothing | none | **invisible** — looks like success |
| `respondToInvitation` throws (accept/decline) | 500 generic JSON | nothing (cause dropped) | none | status visible, **cause lost** |

## 4. Systemic root causes

1. **Failure flattened into a redirect** — `src/pages/api/invitations/index.ts:70-74`.
   The `catch` returns `context.redirect(...?error=...)`. A reasonable local
   choice for *validation* UX, but it is applied to *unexpected server
   failures* too, so a real outage emits a 3xx and never a 5xx. Explains F1.
2. **Empty `catch` drops the cause** — `src/pages/api/invitations/index.ts:70`
   and `src/pages/api/invitations/respond.ts:56`. `catch {` with no binding
   discards the `Error` carrying `result.error.message`. Nothing is logged or
   reported. Explains F1 and F2.
3. **No shared error boundary for API routes** — there is no central wrapper
   that logs/reports before responding, so every route must remember to, and
   these two don't. Explains why F1/F2 exist independently.

## 5. Findings by area

### Walk-invitation-loop

| # | Location | Category | Severity | What happens in production | Fix direction |
|---|---|---|---|---|---|
| F1 | `src/pages/api/invitations/index.ts:70` | error→redirect + swallowed cause | **critical** | Send-invitation failure becomes a 302 with a generic message; no 5xx, no log, no event. North-star flow can be fully down with zero signal. | `catch (err)` → `console.error` with structured context + stack (monitoring), and return a real **500** so the failure reaches the response as a failure. |
| F2 | `src/pages/api/invitations/respond.ts:56` | swallowed cause | high | Accept/decline failure returns 500 (good) but the cause/stack is dropped, so responders hit an opaque error nobody can diagnose. | `catch (err)` → `console.error` with context + stack before the 500. |
| F3 | `src/lib/services/invitation.ts` (all `throw new Error(result.error.message)`) | lost error chain | medium | Supabase error code/details flattened to a message string; `cause` not preserved, so even once logged the PG code is gone. | Throw with `{ cause: result.error }` (or include `code`) so logs carry the PG error code. |

### Platform / plumbing

No error-tracker SDK and no shared API error boundary (see root cause 3). Not
scored as findings per skill rules (a tracker can live outside the repo), but
recorded so a future run can confirm whether monitoring exists.

## 6. Recommended fix order

1. **F1** — highest blindness-removed/effort: one `catch` block. Log the cause
   (monitoring) + return 500 (failure reaches the response). *Constraint:* keep
   the happy-path redirect to `/meetings` unchanged; do not log PII (log
   `userId`/`receiverId`, not names/emails).
2. **F2** — same one-line log pattern; response already signals 500.
3. **F3** — preserve `cause`/PG code so the now-emitted logs are diagnosable.

## 8. Method and limits

- Audited inline (single critical flow; no subagent fan-out needed).
- Spot-checked by hand: read both route handlers and every `throw` in
  `src/lib/services/invitation.ts`; confirmed the empty `catch` bindings and the
  302 redirect on the send-failure path; confirmed 0 tracker-SDK hits in `src/`.
- Runtime proof: not run this pass (static-only). Could be proven with a
  `?probe=` injection against a local fake-ingest endpoint per
  `references/runtime-probes.md`.
- This run fixes **F1** (see the change below / git diff of
  `src/pages/api/invitations/index.ts`).
