import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createDog } from "@/lib/services/dog";
import {
  createDogEvent,
  deleteDogEvent,
  listEventsForOwner,
  listUpcomingForOwner,
  updateDogEvent,
} from "@/lib/services/dogEvents";
import { createServiceRoleClient, createTestUser, deleteTestUser } from "../helpers/supabase";

// Proves the dog calendar persists end-to-end against the real test DB (table,
// columns incl. event_time, and owner-scoped RLS). Requires migrations
// 20261018090001_create_dog_events + 20261018090002_add_dog_event_time applied.

describe("dog calendar — create / list / update / delete", () => {
  let serviceClient: SupabaseClient;
  let user: User;
  let client: SupabaseClient;
  let dogId: string;

  beforeAll(async () => {
    serviceClient = createServiceRoleClient();
    ({ user, client } = await createTestUser(serviceClient, "dog-events-a@test.local", "Test1234!"));
    const dog = await createDog(client, user.id, {
      name: "Rex",
      breed: "Labrador Retriever",
      birthdate: null,
      size: null,
      weightKg: null,
      traits: [],
      photo: null,
    });
    dogId = dog.id;
  });

  afterAll(async () => {
    await serviceClient.from("dog_events").delete().eq("owner_id", user.id);
    await serviceClient.from("dogs").delete().eq("owner_id", user.id);
    await deleteTestUser(serviceClient, user.id);
  });

  it("creates an event (with optional time) and lists it", async () => {
    const created = await createDogEvent(client, user.id, {
      dogId,
      title: "Szczepienie przeciw wściekliźnie",
      type: "vaccination",
      eventDate: "2027-05-10",
      eventTime: "09:30",
      recurrence: "yearly",
      recurrenceInterval: 1,
      notes: "u dr. Kowalskiego",
    });
    expect(created.id).toBeTruthy();
    expect(created.eventTime).toBe("09:30");
    expect(created.recurrence).toBe("yearly");

    const list = await listEventsForOwner(client, user.id);
    expect(list.map((e) => e.id)).toContain(created.id);
  });

  it("updates an existing event", async () => {
    const created = await createDogEvent(client, user.id, {
      dogId,
      title: "Badanie krwi",
      type: "exam",
      eventDate: "2027-06-01",
      recurrence: "none",
      recurrenceInterval: 1,
    });
    const updated = await updateDogEvent(client, user.id, created.id, {
      dogId,
      title: "Badanie krwi (kontrola)",
      type: "exam",
      eventDate: "2027-06-02",
      eventTime: "14:00",
      recurrence: "none",
      recurrenceInterval: 1,
      notes: null,
    });
    expect(updated.title).toBe("Badanie krwi (kontrola)");
    expect(updated.eventTime).toBe("14:00");
    expect(updated.eventDate).toBe("2027-06-02");
  });

  it("surfaces upcoming events and removes on delete", async () => {
    const before = await listUpcomingForOwner(client, user.id, 10);
    expect(before.length).toBeGreaterThan(0);

    const target = before[0].event.id;
    await deleteDogEvent(client, user.id, target);

    const list = await listEventsForOwner(client, user.id);
    expect(list.map((e) => e.id)).not.toContain(target);
  });
});
