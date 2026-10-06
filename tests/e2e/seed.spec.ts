import { test, expect } from "@playwright/test";

// Seed test — the exemplar every /10x-e2e-generated test copies.
// Risk #2 (auth-gating regression): an unauthenticated request to a protected
// route must be redirected to the sign-in page, never served protected content.
//
// Four patterns this seed carries:
//  1. Role/label locators only (getByRole), never CSS or DOM structure.
//  2. Self-contained: no shared state, no dependency on other tests.
//  3. Waits for state (waitForURL / toBeVisible), never a fixed timeout.
//  4. The test name names the risk it protects.
//
// Signed-out by design: it opts out of any saved session so the gate is
// exercised as a true anonymous visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test("auth gate: unauthenticated visit to a protected route redirects to sign-in [risk:#2]", async ({ page }) => {
  // Action — hit a protected route (/dashboard) with no session.
  await page.goto("/dashboard");

  // Assertion — the app redirected to the sign-in page (wait for state).
  await page.waitForURL("**/auth/signin");
  await expect(page).toHaveURL(/\/auth\/signin(?:\?.*)?$/);

  // The real sign-in form rendered — not a blank shell or protected content.
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
