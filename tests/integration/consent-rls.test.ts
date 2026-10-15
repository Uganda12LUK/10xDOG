import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { throwBone, respondToBone } from "@/lib/services/pack";
import { sendInvitation, respondToInvitation } from "@/lib/services/invitation";
import { createServiceRoleClient, createTestUser, deleteTestUser } from "../helpers/supabase";

// Regression for the consent-bypass holes (change: pack-consent-rls). Each test asserts
// the DB *refuses* a forbidden mutation, so a future policy relaxation fails here.
// They go RED against the un-hardened schema (a requester could insert 'accepted',
// rewrite participants, or re-open a terminal row) and GREEN once migration
// 20261014090001_harden_consent_rls.sql is applied to the test database.

describe("consent RLS — pack_connections & invitations state machine", () => {
  let serviceClient: SupabaseClient;
  let userA: User;
  let clientA: SupabaseClient;
  let userB: User;
  let clientB: SupabaseClient;
  let userC: User;

  async function wipeConsentRows(): Promise<void> {
    const ids = [userA.id, userB.id, userC.id];
    const or = ids.map((id) => `requester_id.eq.${id},addressee_id.eq.${id}`).join(",");
    await serviceClient.from("pack_connections").delete().or(or);
    const invOr = ids.map((id) => `sender_id.eq.${id},receiver_id.eq.${id}`).join(",");
    await serviceClient.from("invitations").delete().or(invOr);
  }

  beforeAll(async () => {
    serviceClient = createServiceRoleClient();
    ({ user: userA, client: clientA } = await createTestUser(serviceClient, "consent-rls-a@test.local", "Test1234!"));
    ({ user: userB, client: clientB } = await createTestUser(serviceClient, "consent-rls-b@test.local", "Test1234!"));
    ({ user: userC } = await createTestUser(serviceClient, "consent-rls-c@test.local", "Test1234!"));
  });

  afterEach(async () => {
    await wipeConsentRows();
  });

  afterAll(async () => {
    await wipeConsentRows();
    await deleteTestUser(serviceClient, userA.id);
    await deleteTestUser(serviceClient, userB.id);
    await deleteTestUser(serviceClient, userC.id);
  });

  it("rejects inserting a pack_connection that is already 'accepted'", async () => {
    const { error } = await clientA
      .from("pack_connections")
      .insert({ requester_id: userA.id, addressee_id: userB.id, status: "accepted" });
    expect(error).not.toBeNull();
  });

  it("rejects inserting an invitation that is already 'accepted'", async () => {
    const { error } = await clientA
      .from("invitations")
      .insert({ sender_id: userA.id, receiver_id: userB.id, type: "walk", status: "accepted" });
    expect(error).not.toBeNull();
  });

  it("forbids the addressee from rewriting a participant while responding", async () => {
    const conn = await throwBone(clientA, userA.id, userB.id);

    // B is the addressee and may accept — but must not repoint the connection at a
    // third party (userC) to fabricate a pack C never consented to.
    const { error } = await clientB
      .from("pack_connections")
      .update({ status: "accepted", requester_id: userC.id })
      .eq("id", conn.id);
    expect(error).not.toBeNull();

    const { data } = await serviceClient
      .from("pack_connections")
      .select("requester_id,status")
      .eq("id", conn.id)
      .single();
    expect(data?.requester_id).toBe(userA.id);
    expect(data?.status).toBe("pending");
  });

  it("freezes a connection once it is decided (no re-open of a terminal row)", async () => {
    const conn = await throwBone(clientA, userA.id, userB.id);
    await respondToBone(clientB, userB.id, conn.id, "accepted");

    // Flipping the accepted row to declined must not change it.
    await clientB.from("pack_connections").update({ status: "declined" }).eq("id", conn.id);
    const { data } = await serviceClient.from("pack_connections").select("status").eq("id", conn.id).single();
    expect(data?.status).toBe("accepted");
  });

  it("allows the legitimate pending -> accepted transition by the addressee", async () => {
    const conn = await throwBone(clientA, userA.id, userB.id);
    const accepted = await respondToBone(clientB, userB.id, conn.id, "accepted");
    expect(accepted.status).toBe("accepted");
  });

  // --- invitations: same guarantees as pack_connections ---

  it("forbids the receiver from rewriting a participant on an invitation", async () => {
    const inv = await sendInvitation(clientA, userA.id, userB.id, "walk");

    // B (receiver) may accept but must not repoint the invitation's sender at a third party.
    const { error } = await clientB
      .from("invitations")
      .update({ status: "accepted", sender_id: userC.id })
      .eq("id", inv.id);
    expect(error).not.toBeNull();

    const { data } = await serviceClient.from("invitations").select("sender_id,status").eq("id", inv.id).single();
    expect(data?.sender_id).toBe(userA.id);
    expect(data?.status).toBe("pending");
  });

  it("freezes an invitation once it is decided", async () => {
    const inv = await sendInvitation(clientA, userA.id, userB.id, "walk");
    await respondToInvitation(clientB, userB.id, inv.id, "accepted");

    await clientB.from("invitations").update({ status: "declined" }).eq("id", inv.id);
    const { data } = await serviceClient.from("invitations").select("status").eq("id", inv.id).single();
    expect(data?.status).toBe("accepted");
  });

  it("allows the legitimate pending -> accepted transition by the receiver", async () => {
    const inv = await sendInvitation(clientA, userA.id, userB.id, "walk");
    const accepted = await respondToInvitation(clientB, userB.id, inv.id, "accepted");
    expect(accepted.status).toBe("accepted");
  });
});
