import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Invitation } from "@/types";

interface InvitationRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: InvitationRow): Invitation {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    type: row.type as Invitation["type"],
    status: row.status as Invitation["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function sendInvitation(
  client: SupabaseClient,
  senderId: string,
  receiverId: string,
  type: "walk" | "breeding",
): Promise<Invitation> {
  const result = await client
    .from("invitations")
    .insert({ sender_id: senderId, receiver_id: receiverId, type })
    .select()
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(result.data as InvitationRow);
}

export async function hasPendingInvitation(
  client: SupabaseClient,
  senderId: string,
  receiverId: string,
): Promise<boolean> {
  const result = await client
    .from("invitations")
    .select("id")
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .eq("status", "pending")
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data !== null;
}

export async function listReceivedPending(client: SupabaseClient, userId: string): Promise<Invitation[]> {
  const result = await client
    .from("invitations")
    .select("*")
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as InvitationRow[]).map(mapRow);
}

export async function listSentPending(client: SupabaseClient, userId: string): Promise<Invitation[]> {
  const result = await client
    .from("invitations")
    .select("*")
    .eq("sender_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as InvitationRow[]).map(mapRow);
}

export async function countReceivedPending(client: SupabaseClient, userId: string): Promise<number> {
  const result = await client
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.count ?? 0;
}

export async function listAcceptedMeetings(client: SupabaseClient, userId: string): Promise<Invitation[]> {
  z.uuid().parse(userId);
  const result = await client
    .from("invitations")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq("status", "accepted")
    .order("updated_at", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as InvitationRow[]).map(mapRow);
}

export async function respondToInvitation(
  client: SupabaseClient,
  userId: string,
  invitationId: string,
  response: "accepted" | "declined",
): Promise<Invitation> {
  const result = await client
    .from("invitations")
    .update({ status: response })
    .eq("id", invitationId)
    .eq("receiver_id", userId)
    .select()
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(result.data as InvitationRow);
}
