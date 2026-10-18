import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { throwBone, respondToBone } from "@/lib/services/pack";
import { sendMessage, countUnread, unreadCountsBySender, markConversationRead } from "@/lib/services/chat";
import { createServiceRoleClient, createTestUser, deleteTestUser } from "../helpers/supabase";

// Covers the Pack unread-message indicator (change: pack-unread-indicator):
// counting unread, grouping by sender, and clearing via mark_conversation_read.
// Requires the mark_conversation_read() function from migration
// 20261017090001_messages_mark_read.sql to be present in the test database.

describe("messages — unread counts & mark-as-read", () => {
  let serviceClient: SupabaseClient;
  let userA: User;
  let clientA: SupabaseClient;
  let userB: User;
  let clientB: SupabaseClient;

  async function wipeRows(): Promise<void> {
    const ids = [userA.id, userB.id];
    const msgOr = ids.map((id) => `sender_id.eq.${id},receiver_id.eq.${id}`).join(",");
    await serviceClient.from("messages").delete().or(msgOr);
    const connOr = ids.map((id) => `requester_id.eq.${id},addressee_id.eq.${id}`).join(",");
    await serviceClient.from("pack_connections").delete().or(connOr);
  }

  // Put A and B into an accepted pack so messages RLS (are_in_pack) lets them chat.
  async function connectPack(): Promise<void> {
    const conn = await throwBone(clientA, userA.id, userB.id);
    await respondToBone(clientB, userB.id, conn.id, "accepted");
  }

  beforeAll(async () => {
    serviceClient = createServiceRoleClient();
    ({ user: userA, client: clientA } = await createTestUser(serviceClient, "unread-a@test.local", "Test1234!"));
    ({ user: userB, client: clientB } = await createTestUser(serviceClient, "unread-b@test.local", "Test1234!"));
  });

  afterEach(async () => {
    await wipeRows();
  });

  afterAll(async () => {
    await wipeRows();
    await deleteTestUser(serviceClient, userA.id);
    await deleteTestUser(serviceClient, userB.id);
  });

  it("counts messages addressed to the recipient as unread", async () => {
    await connectPack();
    await sendMessage(clientB, userB.id, userA.id, "hej A");
    await sendMessage(clientB, userB.id, userA.id, "jesteś tam?");

    expect(await countUnread(clientA, userA.id)).toBe(2);
    // The sender sees nothing unread for their own outbound messages.
    expect(await countUnread(clientB, userB.id)).toBe(0);
  });

  it("groups unread by the sender's id", async () => {
    await connectPack();
    await sendMessage(clientB, userB.id, userA.id, "pojedyncza");

    const bySender = await unreadCountsBySender(clientA, userA.id);
    expect(bySender[userB.id]).toBe(1);
  });

  it("clears unread for a conversation once it is opened (mark_conversation_read)", async () => {
    await connectPack();
    await sendMessage(clientB, userB.id, userA.id, "przeczytaj mnie");
    expect(await countUnread(clientA, userA.id)).toBe(1);

    await markConversationRead(clientA, userA.id, userB.id);

    expect(await countUnread(clientA, userA.id)).toBe(0);
    expect(await unreadCountsBySender(clientA, userA.id)).toEqual({});
  });

  it("mark-as-read only touches the caller's own received messages", async () => {
    await connectPack();
    // A -> B. If A (wrongly) could clear this, B's unread would drop to 0.
    await sendMessage(clientA, userA.id, userB.id, "od A do B");

    await markConversationRead(clientA, userA.id, userB.id);

    // B still has the message unread — A's call must not reach B's inbox.
    expect(await countUnread(clientB, userB.id)).toBe(1);
  });
});
