import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createDog, getDog, listDogs, updateDog, deleteDog } from "@/lib/services/dog";
import { createServiceRoleClient, createTestUser, deleteTestUser } from "../helpers/supabase";

// Full CRUD proof for a dog plus the cross-owner denial: user B must not be able to
// edit or delete a dog owned by user A. The happy-path CRUD runs through the service
// layer; the denials hit the raw client so RLS (not an app-level owner filter) is what
// refuses them.

describe("dog CRUD + cross-owner denial", () => {
  let serviceClient: SupabaseClient;
  let userA: User;
  let clientA: SupabaseClient;
  let userB: User;
  let clientB: SupabaseClient;

  beforeAll(async () => {
    serviceClient = createServiceRoleClient();
    ({ user: userA, client: clientA } = await createTestUser(serviceClient, "dog-crud-a@test.local", "Test1234!"));
    ({ user: userB, client: clientB } = await createTestUser(serviceClient, "dog-crud-b@test.local", "Test1234!"));
  });

  afterEach(async () => {
    await serviceClient.from("dogs").delete().or(`owner_id.eq.${userA.id},owner_id.eq.${userB.id}`);
  });

  afterAll(async () => {
    await deleteTestUser(serviceClient, userA.id);
    await deleteTestUser(serviceClient, userB.id);
  });

  it("creates, reads (single + list) its own dog", async () => {
    const dog = await createDog(clientA, userA.id, { name: "Rex", breed: "Labrador", size: "large", traits: ["calm"] });
    expect(dog.id).toBeTruthy();

    const fetched = await getDog(clientA, dog.id);
    expect(fetched?.name).toBe("Rex");

    const list = await listDogs(clientA, userA.id);
    expect(list.map((d) => d.id)).toContain(dog.id);
  });

  it("updates its own dog", async () => {
    const dog = await createDog(clientA, userA.id, { name: "Rex", breed: "Labrador" });
    const updated = await updateDog(clientA, userA.id, dog.id, { name: "Rexy", breed: "Golden Retriever" });
    expect(updated.name).toBe("Rexy");
    expect(updated.breed).toBe("Golden Retriever");
  });

  it("deletes its own dog", async () => {
    const dog = await createDog(clientA, userA.id, { name: "Rex", breed: "Labrador" });
    await deleteDog(clientA, dog.id);
    expect(await getDog(clientA, dog.id)).toBeNull();
  });

  it("forbids user B from editing user A's dog", async () => {
    const dog = await createDog(clientA, userA.id, { name: "Rex", breed: "Labrador" });

    // Raw cross-owner update: RLS must refuse (no owner filter in the query).
    await clientB.from("dogs").update({ name: "hacked" }).eq("id", dog.id);
    const { data } = await serviceClient.from("dogs").select("name").eq("id", dog.id).single();
    expect(data?.name).toBe("Rex");
  });

  it("forbids user B from deleting user A's dog", async () => {
    const dog = await createDog(clientA, userA.id, { name: "Rex", breed: "Labrador" });

    await clientB.from("dogs").delete().eq("id", dog.id);
    const { data } = await serviceClient.from("dogs").select("id").eq("id", dog.id).maybeSingle();
    expect(data?.id).toBe(dog.id);
  });
});
