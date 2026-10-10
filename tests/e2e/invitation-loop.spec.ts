import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// risk: #1 walk-invitation loop — the north-star flow across auth → routing →
// API → DB: A proposes a walk to B, B accepts, and the confirmed meeting shows
// up for BOTH parties. Needs a real two-user session, so it runs against a
// Supabase stack (local, or the remote test project wired in .env.test /
// .dev.vars). The users + profiles are seeded by tests/setup/playwright-global-
// setup.ts, which also wipes prior invitations (teardown-before-setup), so
// re-runs don't collide. It self-skips when that stack is unreachable.
const USERS_PATH = resolve(__dirname, "../setup/.e2e-users.json");

interface E2EUsers {
  userA: { email: string; password: string; id: string };
  userB: { email: string; password: string; id: string };
}

function loadUsers(): E2EUsers {
  return JSON.parse(readFileSync(USERS_PATH, "utf-8")) as E2EUsers;
}

async function signIn(page: import("@playwright/test").Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/signin");
  // SignInForm is a client:load React island: input typed before it hydrates is
  // dropped (controlled inputs reset to ""), and the form blocks its own submit.
  // Retry fill+submit until the sign-in navigation happens — clearing before
  // each fill so re-typing the same value still fires a change event.
  // (`textbox` role targets the inputs unambiguously — getByLabel('Password')
  // would also match the "Show password" button.)
  const emailBox = page.getByRole("textbox", { name: "Email" });
  const passwordBox = page.getByRole("textbox", { name: "Password" });
  await expect(async () => {
    await emailBox.fill("");
    await emailBox.fill(email);
    await passwordBox.fill("");
    await passwordBox.fill(password);
    await expect(emailBox).toHaveValue(email);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/signin"), { timeout: 5_000 });
  }).toPass({ timeout: 40_000 });
}

// A future datetime-local value (the API rejects a past/invalid scheduled_at).
function futureDateTimeLocal(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`;
}

test("invitation loop: User A invites User B, User B accepts, both see the meeting", async ({ browser }) => {
  test.skip(!existsSync(USERS_PATH), "Requires a Supabase stack (tests/setup/.e2e-users.json was not generated).");
  // Multi-step flow across two contexts, hitting a remote DB on each navigation.
  test.setTimeout(120_000);

  const { userA, userB } = loadUsers();
  const userAName = userA.email.split("@")[0];
  const userBName = userB.email.split("@")[0];

  // ── Context A — User A proposes a walk to User B ────────────────────────────
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await signIn(pageA, userA.email, userA.password);

  // Open User B's owner profile and start a meeting proposal from there.
  await pageA.goto(`/map/${userB.id}`);
  await expect(pageA.getByRole("heading", { name: userBName })).toBeVisible();
  await pageA.getByRole("link", { name: "Propose a meeting" }).click();
  await pageA.waitForURL(`**/meetings/new?receiver_id=${userB.id}`);

  // The MeetingForm is a client:only React island — wait for it to hydrate
  // (submit button present) before interacting, or typed input is lost.
  const submit = pageA.getByRole("button", { name: "Send invitation" });
  await expect(submit).toBeVisible({ timeout: 20_000 });

  // Choose a walk, pick a future date; location is pre-filled from the city.
  await pageA.getByText("Walk", { exact: true }).click();
  await pageA.getByLabel("Date & time").fill(futureDateTimeLocal(7));
  await submit.click();

  // On success the API redirects to /meetings (not back to the form with ?error).
  await pageA.waitForURL("**/meetings", { timeout: 20_000 });
  expect(pageA.url()).not.toContain("error");

  // ── Context B — User B sees the invitation and accepts it ───────────────────
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signIn(pageB, userB.email, userB.password);

  await pageB.goto("/meetings");
  await pageB.getByRole("tab", { name: /invitations/i }).click();

  // The inbox card shows the sender (User A) and an Accept button.
  await expect(pageB.getByText(userAName, { exact: false })).toBeVisible({ timeout: 10_000 });

  // Wait for the respond API to actually finish, not just the button's text to
  // flip to its "…" loading label — otherwise the next page load SSRs the
  // Upcoming list before the accept is committed.
  const acceptResponse = pageB.waitForResponse(
    (r) => r.url().includes("/api/invitations/respond") && r.request().method() === "POST",
  );
  await pageB.getByRole("button", { name: "Accept" }).click();
  expect((await acceptResponse).ok()).toBe(true);

  // User B now sees the confirmed meeting under Upcoming.
  await pageB.goto("/meetings");
  await pageB.getByRole("tab", { name: "Upcoming" }).click();
  await expect(pageB.getByText(userAName, { exact: false })).toBeVisible({ timeout: 10_000 });

  // ── Back to Context A — the meeting is visible for User A too ────────────────
  await pageA.goto("/meetings");
  await pageA.getByRole("tab", { name: "Upcoming" }).click();
  await expect(pageA.getByText(userBName, { exact: false })).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
