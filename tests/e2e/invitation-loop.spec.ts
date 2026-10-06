import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface E2EUsers {
  userA: { email: string; password: string; id: string };
  userB: { email: string; password: string; id: string };
}

function loadUsers(): E2EUsers {
  const filePath = resolve(__dirname, "../setup/.e2e-users.json");
  return JSON.parse(readFileSync(filePath, "utf-8")) as E2EUsers;
}

async function signIn(page: import("@playwright/test").Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for redirect away from the sign-in page after successful auth.
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/signin"), { timeout: 15_000 });
}

test("invitation loop: User A invites User B, User B accepts, both see the meeting", async ({ browser }) => {
  const { userA, userB } = loadUsers();

  // ── Context A — User A ──────────────────────────────────────────────────
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  await signIn(pageA, userA.email, userA.password);

  // Navigate directly to User B's owner profile page to send the invitation.
  // The /map list requires geolocation and map hydration; going straight to
  // the detail page is faster and avoids flakiness from the React island.
  await pageA.goto(`/map/${userB.id}`);
  await pageA.waitForURL(`/map/${userB.id}`);

  // Click the "Send walk invitation" submit button.
  await pageA.getByRole("button", { name: /send walk invitation/i }).click();

  // After form POST the page redirects back to /map/<id>?sent=1.
  await pageA.waitForURL((url) => url.pathname === `/map/${userB.id}` && url.searchParams.get("sent") === "1", {
    timeout: 15_000,
  });

  // ── Context B — User B ──────────────────────────────────────────────────
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  await signIn(pageB, userB.email, userB.password);

  // Navigate to the Meetings page and open the Zaproszenia (invitations inbox) tab.
  await pageB.goto("/meetings");
  await pageB.waitForURL("/meetings");

  // Click the "Zaproszenia" tab trigger.
  await pageB.getByRole("tab", { name: /zaproszenia/i }).click();

  // Assert User A's invitation is visible in the inbox.
  const userAName = userA.email.split("@")[0];
  await expect(pageB.getByText(userAName, { exact: false })).toBeVisible({ timeout: 10_000 });

  // Accept the invitation.
  await pageB.getByRole("button", { name: /akceptuj/i }).click();

  // The card should disappear from the inbox after the accept action.
  await expect(pageB.getByRole("button", { name: /akceptuj/i })).not.toBeVisible({ timeout: 10_000 });

  // Navigate back to check the Nadchodzące (upcoming) tab for User B.
  await pageB.goto("/meetings");
  await pageB.waitForURL("/meetings");
  await pageB.getByRole("tab", { name: /nadchodzące/i }).click();
  await expect(pageB.getByText(userAName, { exact: false })).toBeVisible({ timeout: 10_000 });

  // ── Back to Context A — assert User A also sees the meeting ─────────────
  await pageA.goto("/meetings");
  await pageA.waitForURL("/meetings");
  await pageA.getByRole("tab", { name: /nadchodzące/i }).click();

  const userBName = userB.email.split("@")[0];
  await expect(pageA.getByText(userBName, { exact: false })).toBeVisible({ timeout: 10_000 });

  // Clean up contexts.
  await contextA.close();
  await contextB.close();
});
