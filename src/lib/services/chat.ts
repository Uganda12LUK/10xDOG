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
