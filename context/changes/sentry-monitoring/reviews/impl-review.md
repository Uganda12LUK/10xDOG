<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Sentry Error Monitoring

- **Plan**: context/changes/sentry-monitoring/plan.md
- **Scope**: Full plan (Phases 1–5)
- **Reviewed phases**: 1, 2, 3, 4, 5
- **Date**: 2026-10-13
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

All 15 changed files match the plan (no DRIFT / MISSING / EXTRA). Automated criteria green (lint 0 errors, build Complete with and without DSN). Server + client capture proven live in Sentry. Three benign, documented in-spec adaptations: top-level `org/project/authToken` (sourceMapsUploadOptions removed in @sentry/astro v11), the `Astro.response.status = 404` guard idiom in the .astro page (eslint-crash workaround, matches kitchen-sink), and the worker tagging `environment` at runtime via `SENTRY_ENV`.

## Findings

### F1 — Manual CI criteria 4.4 / 4.5 pending (not verifiable locally)

- **Severity**: 🟦 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/sentry-monitoring/plan.md (Progress 4.4, 4.5)
- **Detail**: 4.4 (prod event shows un-minified frames after a CI build with secrets) and 4.5 (CI run without secrets still green) are honestly unchecked — they require GitHub repo secrets (`SENTRY_AUTH_TOKEN`/`ORG`/`PROJECT`) and a push to `main`. 4.1 (local no-token build green) strongly evidences 4.5; not rubber-stamped.
- **Fix**: Add the three repo secrets (rotate the auth token first — it was pasted in chat) and push; CI then uploads source maps and both criteria confirm.
- **Decision**: SKIPPED — user will handle at push time; archive surfaces 4.4/4.5 as warnings.

### F2 — Server-side gating uses SDK no-op, not the shared `sentryEnabled` helper

- **Severity**: 🟦 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: sentry.server.config.ts:4-9 vs src/lib/sentry-env.ts
- **Detail**: The client path gates `Sentry.init` behind `sentryEnabled(dsn)` (build-time `import.meta.env.PROD`). The worker wrapper instead passes `dsn: env.SENTRY_DSN` and relies on the Cloudflare SDK treating an undefined DSN as disabled. This is a necessary asymmetry — the worker decides at runtime from `env`, where build-time `import.meta.env` is not the right signal — and it degrades safely (no crash without DSN). Documented in the helper comment.
- **Fix**: None needed; leave as-is. Optionally add a one-line comment in `sentry.server.config.ts` pointing to the helper to explain the asymmetry.
- **Decision**: FIXED — added a comment in sentry.server.config.ts explaining the runtime-vs-build-time gating asymmetry.

### F3 — Trap renders only in dev, Sentry initializes only in prod builds — the two never overlap

- **Severity**: 🟦 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/pages/dev/sentry-check.astro:8 + src/lib/sentry-env.ts:10
- **Detail**: The trap is guarded by `import.meta.env.DEV` (renders only in `npm run dev`), while the client SDK gates on `import.meta.env.PROD` (off in dev) and the worker runs only in preview/deploy (not `npm run dev`). So in dev the trap renders but Sentry is off; in preview/prod Sentry is on but the trap 404s. Live end-to-end verification this session required a temporary (worktree-only, reverted) relaxation of the trap guard + a real DSN in `.dev.vars`. This is a consequence of two approved decisions ("trap 404s in prod" + "Sentry off in local dev"), not an implementation bug — but it means the committed trap cannot prove capture in any single standard command without a manual override.
- **Fix**: Follow-up change — distinguish "preview" from "production" via an env flag so the trap renders in preview deploys (where Sentry is on) while still 404-ing in true production. Record as a lesson so the next dev-trap aligns its guard with the monitoring gate.
- **Decision**: ACCEPTED-AS-RULE — lesson added to context/foundation/lessons.md ("Dev-only trap musi renderować się tam, gdzie testowana rzecz jest aktywna"); code fix deferred to a separate change at deploy time.
```
