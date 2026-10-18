import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@/types";

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

// Send a 1:1 message. RLS enforces both that sender_id is the caller AND that the
// two parties are in the same pack — a non-member insert is rejected by the DB.
export async function sendMessage(
  client: SupabaseClient,
  senderId: string,
  receiverId: string,
  body: string,
): Promise<Message> {
  const result = await client
    .from("messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, body })
    .select()
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(result.data as MessageRow);
}

// Total number of unread messages addressed to the caller, across all pack
// threads. Drives the global "something waiting in Pack" badge in the nav.
export async function countUnread(client: SupabaseClient, userId: string): Promise<number> {
  const result = await client
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.count ?? 0;
}

// Unread counts grouped by the sender's id, so the pack list can show which
// member is waiting on a reply. Senders with zero unread simply don't appear.
export async function unreadCountsBySender(client: SupabaseClient, userId: string): Promise<Record<string, number>> {
  const result = await client.from("messages").select("sender_id").eq("receiver_id", userId).is("read_at", null);

  if (result.error) {
    throw new Error(result.error.message);
  }
  const counts: Record<string, number> = {};
  for (const row of result.data as Pick<MessageRow, "sender_id">[]) {
    counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1;
  }
  return counts;
}

// Mark every still-unread message from `otherId` to the caller as read. Delegated
// to a SECURITY DEFINER function (see the messages_mark_read migration) so the
// table needs no broad UPDATE policy. Called when the viewer opens the thread.
export async function markConversationRead(client: SupabaseClient, _userId: string, otherId: string): Promise<void> {
  const result = await client.rpc("mark_conversation_read", { other: otherId });
  if (result.error) {
    throw new Error(result.error.message);
  }
}

// Full conversation between the caller and one other owner, oldest first. RLS
// scopes reads to pack participants, so this can only ever return the caller's
// own threads.
export async function listConversation(client: SupabaseClient, userId: string, otherId: string): Promise<Message[]> {
  const result = await client
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as MessageRow[]).map(mapRow);
}
