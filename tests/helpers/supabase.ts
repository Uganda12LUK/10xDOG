import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "http://127.0.0.1:54321";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7URIqUfev2-W9Epvl2V2BkMOlGFBiMHb3Kk";

/**
 * Anon client for use in tests — reads SUPABASE_TEST_URL and
 * SUPABASE_TEST_ANON_KEY from the environment (populated by .env.test).
 */
export function createAnonClient(): ReturnType<typeof createClient> {
  const url = process.env.SUPABASE_TEST_URL ?? DEFAULT_URL;
  const key = process.env.SUPABASE_TEST_ANON_KEY ?? DEFAULT_ANON_KEY;
  return createClient(url, key);
}

/**
 * Service-role client for admin operations (user creation, teardown).
 * Reads SUPABASE_TEST_SERVICE_ROLE_KEY from the environment.
 */
export function createServiceRoleClient(): ReturnType<typeof createClient> {
  const url = process.env.SUPABASE_TEST_URL ?? DEFAULT_URL;
  const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key);
}

/**
 * Signs in a test user and returns the same client (session stored in-memory).
 */
export async function signInTestUser(client: SupabaseClient, email: string, password: string): Promise<SupabaseClient> {
  await client.auth.signInWithPassword({ email, password });
  return client;
}
