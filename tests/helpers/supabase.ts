import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

const DEFAULT_URL = "http://127.0.0.1:54321";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7URIqUfev2-W9Epvl2V2BkMOlGFBiMHb3Kk";

export function createAnonClient(): ReturnType<typeof createClient> {
  const url = process.env.SUPABASE_TEST_URL ?? DEFAULT_URL;
  const key = process.env.SUPABASE_TEST_ANON_KEY ?? DEFAULT_ANON_KEY;
  return createClient(url, key);
}

export function createServiceRoleClient(): ReturnType<typeof createClient> {
  const url = process.env.SUPABASE_TEST_URL ?? DEFAULT_URL;
  const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key);
}

export async function signInTestUser(client: SupabaseClient, email: string, password: string): Promise<SupabaseClient> {
  await client.auth.signInWithPassword({ email, password });
  return client;
}

export async function createTestUser(
  serviceClient: SupabaseClient,
  email: string,
  password: string,
): Promise<{ user: User; client: SupabaseClient }> {
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    throw new Error(error.message);
  }
  const client = createAnonClient();
  await signInTestUser(client, email, password);
  return { user: data.user, client };
}

export async function deleteTestUser(serviceClient: SupabaseClient, userId: string): Promise<void> {
  await serviceClient.from("invitations").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  await serviceClient.auth.admin.deleteUser(userId);
}
