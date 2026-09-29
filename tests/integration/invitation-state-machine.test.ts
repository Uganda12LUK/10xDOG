import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  listAcceptedMeetings,
  listReceivedPending,
  respondToInvitation,
  sendInvitation,
} from "@/lib/services/invitation";
import { createServiceRoleClient, createTestUser, deleteTestUser } from "../helpers/supabase";

describe("invitation state machine", () => {
  let serviceClient: SupabaseClient;
  let userA: User;
  let clientA: SupabaseClient;
  let userB: User;
  let clientB: SupabaseClient;
  let sharedInvitationId: string;

  beforeAll(async () => {
    serviceClient = createServiceRoleClient();
    ({ user: userA, client: clientA } = await createTestUser(serviceClient, "state-machine-a@test.local", "Test1234!"));
    ({ user: userB, client: clientB } = await createTestUser(serviceClient, "state-machine-b@test.local", "Test1234!"));
  });

  afterAll(async () => {
    await deleteTestUser(serviceClient, userA.id);
    await deleteTestUser(serviceClient, userB.id);
  });

  it("User B sees User A's invitation in inbox", async () => {
    const invitation = await sendInvitation(clientA, userA.id, userB.id, "walk");
    sharedInvitationId = invitation.id;
    const inbox = await listReceivedPending(clientB, userB.id);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].id).toBe(invitation.id);
  });

  it("Meetings tab shows 0 rows while invitation is pending", async () => {
    const meetingsA = await listAcceptedMeetings(clientA, userA.id);
    const meetingsB = await listAcceptedMeetings(clientB, userB.id);
    expect(meetingsA).toHaveLength(0);
    expect(meetingsB).toHaveLength(0);
  });

  it("Meetings tab shows 0 rows after declining", async () => {
    await respondToInvitation(clientB, userB.id, sharedInvitationId, "declined");
    const meetingsA = await listAcceptedMeetings(clientA, userA.id);
    const meetingsB = await listAcceptedMeetings(clientB, userB.id);
    expect(meetingsA).toHaveLength(0);
    expect(meetingsB).toHaveLength(0);
  });

  it("Both parties see exactly 1 meeting after accepting", async () => {
    const invitation = await sendInvitation(clientA, userA.id, userB.id, "walk");
    await respondToInvitation(clientB, userB.id, invitation.id, "accepted");
    const meetingsA = await listAcceptedMeetings(clientA, userA.id);
    const meetingsB = await listAcceptedMeetings(clientB, userB.id);
    expect(meetingsA).toHaveLength(1);
    expect(meetingsB).toHaveLength(1);
    expect(meetingsA[0].id).toBe(meetingsB[0].id);
  });
});
