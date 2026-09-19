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

PawMeet is a solo, after-hours web-app targeting a 3-week MVP at small scale, and its Functional Requirements force two technology decisions: account login (FR-001) and owner/dog image uploads (FR-002, FR-003). The 10x Astro Starter is the recommended default for `(web, js)` and handles exactly those needs out of the box — Supabase supplies PostgreSQL, auth, and file storage, while Astro + React + TypeScript give project-wide explicit contracts an agent can reason over. It clears all four agent-friendly quality gates (typed, convention-based, popular in training data, well documented), so no quality override was needed. Deployment defaults to Cloudflare Pages with GitHub Actions auto-deploy on merge — the starter's shipped shape, cheapest path to a first deploy for a solo builder. Payments, realtime, AI, and background jobs are all out of scope per the PRD. Scaffolding confidence is first-class: expect mostly-smooth setup with the occasional manual step.
