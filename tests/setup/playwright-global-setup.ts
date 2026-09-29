import { writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";

const USER_A_EMAIL = "e2e-user-a@test.local";
const USER_B_EMAIL = "e2e-user-b@test.local";
const TEST_PASSWORD = "Test1234!";
const TEST_CITY = "Warszawa";

const OUTPUT_PATH = resolve(__dirname, ".e2e-users.json");

function loadEnvTest(): void {
  const envTestPath = resolve(process.cwd(), ".env.test");
  if (existsSync(envTestPath)) {
    // Node 20.12+ ships process.loadEnvFile; use it when available.
    type ProcessWithLoadEnv = typeof process & { loadEnvFile?: (path: string) => void };
    const p = process as ProcessWithLoadEnv;
    if (typeof p.loadEnvFile === "function") {
      p.loadEnvFile(envTestPath);
    }
  }
}

export default async function playwrightGlobalSetup(): Promise<void> {
  loadEnvTest();

  // Re-read after env load in case the values changed.
  const url = process.env.SUPABASE_TEST_URL ?? SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? SERVICE_ROLE_KEY;

  const serviceClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function upsertUser(email: string): Promise<string> {
    // Try to find existing user first so we can clean it up for a fresh state.
    const { data: list } = await serviceClient.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === email);

    if (existing) {
      await serviceClient.from("invitations").delete().or(`sender_id.eq.${existing.id},receiver_id.eq.${existing.id}`);
      await serviceClient.auth.admin.deleteUser(existing.id);
    }

    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Failed to create test user ${email}: ${error.message}`);
    }

    const userId = data.user.id;

    // Upsert a minimal profile so the user appears on the /owners page.
    const { error: profileError } = await serviceClient.from("profiles").upsert(
      {
        id: userId,
        name: email.split("@")[0],
        city: TEST_CITY,
        district: null,
        avatar_path: null,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      // Non-fatal — the test may still work if the owners page renders without profiles.
      // eslint-disable-next-line no-console
      console.warn(`[playwright-global-setup] Could not upsert profile for ${email}: ${profileError.message}`);
    }

    return userId;
  }

  const [userAId, userBId] = await Promise.all([upsertUser(USER_A_EMAIL), upsertUser(USER_B_EMAIL)]);

  const payload = {
    userA: { email: USER_A_EMAIL, password: TEST_PASSWORD, id: userAId },
    userB: { email: USER_B_EMAIL, password: TEST_PASSWORD, id: userBId },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf-8");

  // eslint-disable-next-line no-console
  console.log(`[playwright-global-setup] Test users ready — written to ${OUTPUT_PATH}`);
}
