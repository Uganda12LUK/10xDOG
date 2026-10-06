# E2E Quality Rules

These rules govern every E2E test the agent writes. They are **not** copied into
your agent's rules file (`CLAUDE.md`, `AGENTS.md`, …): they matter only while
you work on E2E tests, so they ship with the skills and load when one runs.
`/10x-e2e-setup` writes the seed to follow them; `/10x-e2e` reads this file
before it generates a test and reviews every test against it. The rules
constrain the agent's output so generated tests are stable by default — agents
apply known patterns far more reliably than they invent new ones.

## The rules (Playwright)

```
# E2E Testing Rules

- Use getByRole, getByLabel, getByText as primary locators.
  Fall back to getByTestId only when accessibility attributes are ambiguous.
- Never use CSS selectors, XPath, or DOM structure for locating elements.
- Each test must be independently runnable — no shared state between tests.
- Never use page.waitForTimeout(). Wait for specific conditions:
  toBeVisible(), waitForURL(), waitForResponse().
- Assert the business outcome, not implementation details.
- Use unique identifiers (e.g., timestamp suffix) for test data
  to avoid collisions in parallel runs. Clean up in afterEach and
  assert every cleanup call succeeded (expect(res).toBeOK()) — a
  cleanup that fails silently leaves data behind while the test stays green.
- Use storageState for authentication — never log in through UI
  in individual tests.
```

## Governing rules (the reasoning behind the rules)

- **Don't generate E2E tests from scratch.** Start from `test-plan.md`: pick the
  2–3 highest risks that need browser-level coverage and feed them as input. A
  risk needs E2E when it crosses several system boundaries (auth, routing, API,
  DB) or exists only in the rendered UI; if an isolated function can prove it, a
  unit test is enough.
- **E2E ≠ zero mocking.** Internal boundaries (auth, routing, DB) stay real —
  that's where integration risk hides. Mock expensive/non-deterministic external
  APIs (LLMs, payment gateways) at the network layer.
- **Name the test after the risk:** `test('flashcard data persists after page
  reload', ...)`, not `test('test 1', ...)`.
- **The assertion must fail if the risk materializes.** Control question for
  every assertion: would this fail if the `test-plan.md` risk came true? If not,
  it's decorative.

## Why these rules (source authority)

Every rule traces to Playwright's official Best Practices and Test Assertions
docs:

- `getByRole` is the recommended default locator strategy; CSS selectors couple
  tests to implementation details.
- Each test must be completely isolated with its own storage, data, cookies.
- Web-first assertions wait until conditions are met; `waitForTimeout` is
  officially designated an anti-pattern ("Never wait for timeout in production.
  Tests that wait for time are inherently flaky").
- `storageState` is the standard pattern for authenticated tests.

## Other stacks

The rules above are Playwright syntax; the principles are tool-agnostic. Map
each to your tool's idiom:

| Principle | Playwright | Cypress | WebdriverIO / Selenium |
| --- | --- | --- | --- |
| Role-based locator | `getByRole` | `cy.findByRole` (Testing Library) | accessibility-name / role strategy |
| Wait for state | `expect().toBeVisible()`, `waitForResponse` | `cy.contains().should('be.visible')`, `cy.intercept` | explicit waits on conditions, never `sleep` |
| Test isolation | parallel workers, own data | `beforeEach` reset, no shared aliases | fresh session per test |
| Auth without UI | `storageState` | `cy.session` | saved cookies / token injection |
| Data cleanup | unique ids + `afterEach`, each call asserted | unique ids + `afterEach`, each call asserted | unique ids + teardown, each call asserted |

If you work on a non-Playwright stack, write these mappings into your seed test
and your E2E prompts so the agent produces idiomatic, stable tests for your tool.

## Project conventions — PawMeet (added by /10x-e2e-setup)

These are PawMeet-specific facts every generated spec must respect. They sit on
top of the generic rules above, they do not replace them.

- **Server, never `dev`.** The app is driven by `npm run e2e:preview` (build +
  `astro preview`) on port **4321**; `astro dev` crashes under this toolchain.
  The `webServer` already does this — tests never start their own server.
- **i18n accessible names.** Default locale is **`en`** (`DEFAULT_LOCALE`), so an
  anonymous visitor sees English names: `getByRole('heading', { name: 'Sign in' })`,
  `getByLabel('Email')`, `getByLabel('Password')`. A few authed views are Polish
  regardless of locale — the meetings tabs/actions: `getByRole('tab', { name: /zaproszenia/i })`,
  `/nadchodzące/i`, and the `/akceptuj/i` button. Match what the view actually
  renders; switch language by setting the `pawmeet_locale` cookie, never by
  guessing a translation.
- **Auth: no `storageState` here.** A logged-in session can't be minted locally
  (local Supabase needs Docker, which is blocked on this machine), so there is no
  `auth.setup.ts` / saved session. Prefer **signed-out** risks (auth-gate), which
  need no backend. A spec that needs two real users (the invitation loop) signs in
  through its own two-context UI flow against users seeded by
  `tests/setup/playwright-global-setup.ts`, and must `test.skip()` when
  `tests/setup/.e2e-users.json` is absent (local stack down) — skip, don't fail.
- **Protected routes for auth-gate coverage** (from `src/lib/protected-routes.ts`):
  `/dashboard`, `/profile`, `/dogs`, `/map`, `/meetings`. An unauthenticated GET to
  any of them must redirect to `/auth/signin`.
- **Cleanup for data-writing specs.** Rows written through the UI (e.g.
  invitations) are cleaned via the Supabase **service-role** client in the global
  setup's user re-seed; assert any direct cleanup call succeeded. Signed-out specs
  write nothing and need no cleanup.
- **Orphan preview listener.** `astro preview` (Cloudflare → wrangler/workerd) can
  leave a listener on 4321 after a run. It's harmless for signed-out specs (stale
  build still redirects), but kill stray `workerd.exe` if you need a guaranteed
  cold build.
