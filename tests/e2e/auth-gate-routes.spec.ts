import { test, expect } from "@playwright/test";
import { PROTECTED_ROUTES } from "../../src/lib/protected-routes";

// risk: #2 auth-gating regression — facet: EVERY protected route redirects a
// signed-out visitor to /auth/signin. seed.spec.ts covers the single /dashboard
// case; this spec extends it to the whole PROTECTED_ROUTES list, imported from
// source so a newly added route is covered automatically (the risk's "must
// challenge": middleware present ⇏ it covers newly added routes).
//
// Modeled on seed.spec.ts: signed-out (opts out of any saved session),
// role-based locators, waits for state (waitForURL), and a risk-tied name.
// Signed-out and read-only — creates no data, so there is nothing to clean up.
test.use({ storageState: { cookies: [], origins: [] } });

for (const route of PROTECTED_ROUTES) {
  test(`auth gate: unauthenticated visit to ${route} redirects to sign-in [risk:#2]`, async ({ page }) => {
    // Action — hit the protected route with no session.
    await page.goto(route);

    // Assertion — redirected to the sign-in page (wait for state, not time).
    await page.waitForURL("**/auth/signin");
    await expect(page).toHaveURL(/\/auth\/signin(?:\?.*)?$/);

    // The real sign-in form rendered — not protected content leaking through.
    // `heading` role disambiguates from the nav "Sign in" link.
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
}
