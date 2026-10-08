---
starter_id: 10x-astro-starter
package_manager: npm
project_name: pawmeet
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

PawMeet is a solo, after-hours web-app targeting a 3-week MVP at small scale. Its Functional Requirements force auth and owner/dog profile photo uploads (FR-001–FR-003), with a local-owner discovery and invitation flow (FR-004–FR-007) and a breeding-partner feature (FR-009–FR-011) — nothing that needs payments, realtime, AI, or background jobs. The 10x Astro Starter is the recommended default for `(web-app, js)`: Supabase supplies PostgreSQL, auth, and file storage out of the box, while Astro + React + TypeScript give project-wide explicit contracts an agent can reason over without ambiguity. It clears all four agent-friendly quality gates (typed, convention-based, popular in training data, well documented), so no quality override was needed. Deployment defaults to Cloudflare Pages; CI runs on GitHub Actions with auto-deploy on merge — the starter's shipped shape and cheapest path to a first deploy for a solo builder. Scaffolding confidence is first-class: expect mostly-smooth setup with the occasional manual step.
