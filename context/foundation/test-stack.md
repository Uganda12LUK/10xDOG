# Test stack

## E2E

<!-- Written by /10x-e2e-setup. Re-run it to change this section; other skills only read it. -->

- runner: Playwright Test, @playwright/test 1.63.0
- config: playwright.config.ts
- single-spec command: npx playwright test tests/e2e/seed.spec.ts
- full-suite command: npx playwright test
- base URL: http://localhost:4321
- port: 4321 (detected from Astro's preview default; override with E2E_PORT)
- web server command: npm run e2e:preview -- --port 4321 --host 127.0.0.1 --ignore-lock (= `astro build && astro preview`, one long-lived npm script so Playwright doesn't read the build's exit as an early server exit); webServer env sets ASTRO_PREVIEW_BACKGROUND=1 to keep preview in the foreground (Astro auto-backgrounds under CLAUDECODE); reuseExistingServer outside CI
- workers: 1 — serialized; one preview server + remote Supabase (getUser per request) flakes under parallel load
- auth setup project: none — the auth-gate risks are signed-out; the invitation-loop spec signs in through its own two-context UI flow (handling the client:load hydration race via a toPass retry) using the users created by tests/setup/playwright-global-setup.ts (globalSetup), which no-ops when the Supabase stack is unreachable (then that spec self-skips)
- storageState: none
- seed: tests/e2e/seed.spec.ts — protects #2 (auth-gating regression: an unauthenticated request to a protected route must redirect to /auth/signin, never serve protected content)
- browser CLI: playwright-cli 0.1.22 (global via nvm bin `C:\Users\ugand\AppData\Local\Author Software\nvm\installs\v22.14.0\playwright-cli.cmd`; not on the bash PATH — invoke by full path or via the Skill), command skill at .claude/skills/playwright-cli/SKILL.md
- updated: 2026-10-06

### Environment notes (this machine)

- `astro dev` crashes under this toolchain (vite@8 `moduleType`); E2E always uses build + preview.
- Local Supabase (`127.0.0.1:54321`) can't start here (Docker needs BIOS virtualization, off on this Win10 Home box). **Workaround (Droga B):** a remote throwaway Supabase test project is wired via `.env.test` (globalSetup → service/secret key) and `.dev.vars` (the preview app → publishable key, same project). Schema applied by pasting `supabase/_remote_test_bundle.sql` (all migrations) into the dashboard SQL Editor. With that, `invitation-loop.spec.ts` (Risk #1) runs for real; drop/empty `.env.test` and it self-skips.
- If the preview build crashes with "msg.includes is not a function" (stale vite cache): `rm -rf node_modules/.vite .astro`.
- `astro preview` can leave an orphan `workerd.exe` listener on 4321 after a run; for a guaranteed cold run: `npx astro preview stop` then kill stray `workerd.exe`.
