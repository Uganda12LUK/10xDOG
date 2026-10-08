import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// risk: pack-chat-loop — "moje stado" across auth → routing → API → DB → RLS:
// A throws a bone to B, B catches it, and the accepted connection unlocks a 1:1
// chat both can read and write. Facet covered: the happy path end-to-end. The
// RLS-deny facet (a non-pack user cannot read the conversation) is a security
// assertion better proven at the integration layer (test-plan §Phase 2), not in
// a browser, so it is deliberately out of scope here.
//
// Needs a real two-user session, so it runs against the Supabase stack wired via
// .env.test / .dev.vars. Users (+ profiles) are seeded by tests/setup/playwright-
// global-setup.ts, which deletes+recreates both users each run; the FK
// `on delete cascade` from pack_connections/messages to auth.users wipes prior
// pack + chat rows, so re-runs start clean with no in-test teardown (same pattern
// as invitation-loop.spec.ts). Self-skips when that stack is unreachable.
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
  // Retry fill+submit until the sign-in navigation happens (same race the
  // invitation-loop spec handles).
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

test("pack+chat loop: A throws a bone, B catches it, both chat in their pack", async ({ browser }) => {
  test.skip(!existsSync(USERS_PATH), "Requires a Supabase stack (tests/setup/.e2e-users.json was not generated).");
  // Multi-step flow across two contexts, hitting a remote DB on each navigation.
  test.setTimeout(120_000);

  const { userA, userB } = loadUsers();
  const userAName = userA.email.split("@")[0];
  const userBName = userB.email.split("@")[0];
  // Unique, findable message bodies so assertions can't collide across re-runs.
  const stamp = Date.now();
  const msgFromB = `hi from B ${stamp}`;
  const msgFromA = `reply from A ${stamp}`;

  // ── Context A — User A throws a bone to User B from B's profile ──────────────
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await signIn(pageA, userA.email, userA.password);

  await pageA.goto(`/map/${userB.id}`);
  await expect(pageA.getByRole("heading", { name: userBName })).toBeVisible();

  // The bone button is a server-rendered form POST (no hydration wait needed);
  // clicking it navigates back to the profile with the pending state shown.
  await pageA.getByRole("button", { name: "Throw a bone" }).click();
  await pageA.waitForURL(`**/map/${userB.id}`);
  await expect(pageA.getByRole("button", { name: "Bone thrown — awaiting" })).toBeVisible();

  // ── Context B — User B sees the bone and catches it ─────────────────────────
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signIn(pageB, userB.email, userB.password);

  await pageB.goto("/pack");
  // PackView is a client:load island — wait for the Catch control to hydrate.
  const catchBtn = pageB.getByRole("button", { name: "Catch" });
  await expect(catchBtn).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByText(userAName, { exact: false })).toBeVisible();

  // Wait for the respond API to actually commit before asserting the UI moved
  // the member into the accepted pack list.
  const respondOk = pageB.waitForResponse(
    (r) => r.url().includes("/api/pack/respond") && r.request().method() === "POST",
  );
  await catchBtn.click();
  expect((await respondOk).ok()).toBe(true);

  // ── Context B — open the chat and send the first message ────────────────────
  await pageB.goto(`/messages/${userA.id}`);
  await expect(pageB.getByRole("heading", { name: userAName })).toBeVisible();

  const inputB = pageB.getByRole("textbox");
  await expect(inputB).toBeVisible({ timeout: 20_000 });
  const sendOkB = pageB.waitForResponse((r) => r.url().includes("/api/messages") && r.request().method() === "POST");
  await inputB.fill(msgFromB);
  await pageB.getByRole("button", { name: "Send" }).click();
  expect((await sendOkB).ok()).toBe(true);
  await expect(pageB.getByText(msgFromB)).toBeVisible();

  // ── Context A — the pack badge now shows, and A reads + replies ─────────────
  await pageA.reload();
  await expect(pageA.getByText("In your pack")).toBeVisible();

  await pageA.goto(`/messages/${userB.id}`);
  await expect(pageA.getByText(msgFromB)).toBeVisible({ timeout: 20_000 });

  const inputA = pageA.getByRole("textbox");
  await expect(inputA).toBeVisible({ timeout: 20_000 });
  const sendOkA = pageA.waitForResponse((r) => r.url().includes("/api/messages") && r.request().method() === "POST");
  await inputA.fill(msgFromA);
  await pageA.getByRole("button", { name: "Send" }).click();
  expect((await sendOkA).ok()).toBe(true);

  // ── Context B — sees A's reply after a refetch ──────────────────────────────
  await pageB.reload();
  await expect(pageB.getByText(msgFromA)).toBeVisible({ timeout: 20_000 });

  await contextA.close();
  await contextB.close();
});
