import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceRoleClient, createTestUser, deleteTestUser } from "../helpers/supabase";

// DB-boundary proof (change: profile-private-location). A non-owner must not be able to
// read another owner's street/GPS via the Data API, because those columns now live in an
// owner-only `profile_locations` table — not on `profiles`. Discovery still surfaces a
// nearby owner through the SECURITY DEFINER RPC, which returns IDs only (no coords).
//
// RED until migration 20261015090001_profile_private_location.sql is applied to the test
// DB (the table + RPC do not exist on the un-migrated schema, and `profiles` still carries
// the private columns); GREEN once applied.

describe("profile location privacy (DB boundary)", () => {
  let serviceClient: SupabaseClient;
  let userA: User;
  let clientA: SupabaseClient;
  let userB: User;
  let clientB: SupabaseClient;

  const SECRET_LAT = 49.99;
  const SECRET_LNG = 22.05;
  const SECRET_STREET = "ul. Tajna 1";

  beforeAll(async () => {
    serviceClient = createServiceRoleClient();
    ({ user: userA, client: clientA } = await createTestUser(serviceClient, "profloc-a@test.local", "Test1234!"));
    ({ user: userB, client: clientB } = await createTestUser(serviceClient, "profloc-b@test.local", "Test1234!"));

    // Public profiles for both (same city so discovery pairs them via the city-center anchor).
    await serviceClient.from("profiles").upsert([
      { id: userA.id, name: "Alice", city: "Rzeszów" },
      { id: userB.id, name: "Bob", city: "Rzeszów" },
    ]);

    // A's private location, written by A (owner-only).
    await clientA
      .from("profile_locations")
      .upsert({ profile_id: userA.id, district: SECRET_STREET, location_lat: SECRET_LAT, location_lng: SECRET_LNG });
  });

  afterAll(async () => {
    // Deleting the profiles rows cascades profile_locations; service role bypasses RLS.
    await serviceClient.from("profiles").delete().in("id", [userA.id, userB.id]);
    await deleteTestUser(serviceClient, userA.id);
    await deleteTestUser(serviceClient, userB.id);
  });

  it("hides another owner's private location row (owner-only RLS)", async () => {
    const res = (await clientB.from("profile_locations").select("*").eq("profile_id", userA.id)) as {
      data: unknown[] | null;
    };
    expect(res.data ?? []).toHaveLength(0);
  });

  it("exposes no street/coordinate columns on the public profiles row", async () => {
    const res = (await clientB.from("profiles").select("*").eq("id", userA.id).single()) as {
      data: Record<string, unknown> | null;
    };
    for (const key of Object.keys(res.data ?? {})) {
      expect(key).not.toMatch(/district|location_lat|location_lng|street/i);
    }
    // Secret values must not appear anywhere in the serialized public row.
    expect(JSON.stringify(res.data)).not.toContain(String(SECRET_LAT));
    expect(JSON.stringify(res.data)).not.toContain(SECRET_STREET);
  });

  it("lets the owner read their own private location", async () => {
    const res = (await clientA
      .from("profile_locations")
      .select("location_lat")
      .eq("profile_id", userA.id)
      .single()) as { data: { location_lat: number } | null };
    expect(res.data?.location_lat).toBe(SECRET_LAT);
  });

  it("still surfaces a nearby owner via the discovery RPC (IDs only, no coords)", async () => {
    const res = (await clientB.rpc("discoverable_owner_ids", { radius_km: 75 })) as {
      data: string[] | null;
      error: unknown;
    };
    expect(res.error).toBeNull();
    expect(res.data ?? []).toContain(userA.id);
  });
});
