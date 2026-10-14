import type { SupabaseClient } from "@supabase/supabase-js";
import type { PackConnection, PackMember, PackStatus } from "@/types";
import { getProfile } from "./profile";

interface PackConnectionRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: PackConnectionRow): PackConnection {
  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status as PackConnection["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// "Throw a bone" — the requester initiates a pack connection. RLS enforces that
// requester_id is the caller; the DB CHECK blocks self-invites and the partial
// unique index blocks a duplicate pending request.
export async function throwBone(
  client: SupabaseClient,
  requesterId: string,
  addresseeId: string,
): Promise<PackConnection> {
  const result = await client
    .from("pack_connections")
    .insert({ requester_id: requesterId, addressee_id: addresseeId })
    .select()
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(result.data as PackConnectionRow);
}

// "Catch the bone" (accept) or decline — only the addressee may act, enforced by
// both the RLS update policy and the receiver filter here.
export async function respondToBone(
  client: SupabaseClient,
  userId: string,
  connectionId: string,
  response: "accepted" | "declined",
): Promise<PackConnection> {
  const result = await client
    .from("pack_connections")
    .update({ status: response })
    .eq("id", connectionId)
    .eq("addressee_id", userId)
    .select()
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(result.data as PackConnectionRow);
}

// The viewer's relationship to another owner, used to render the bone button /
// pack badge on a profile.
export async function getPackStatus(client: SupabaseClient, viewerId: string, otherId: string): Promise<PackStatus> {
  const result = await client
    .from("pack_connections")
    .select("*")
    .or(
      `and(requester_id.eq.${viewerId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${viewerId})`,
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) {
    return "none";
  }

  const row = mapRow(result.data as PackConnectionRow);
  if (row.status === "accepted") {
    return "accepted";
  }
  if (row.status === "declined") {
    return "none";
  }
  // pending — distinguish who still has to act.
  return row.requesterId === viewerId ? "pending_out" : "pending_in";
}

export async function isInPack(client: SupabaseClient, a: string, b: string): Promise<boolean> {
  return (await getPackStatus(client, a, b)) === "accepted";
}

// The viewer's pack status toward every owner they have a connection with, keyed
// by the other owner's id. One query for the whole map (declined rows are omitted
// = "none"). Used to render the right bone control per dog in discovery.
export async function listPackStatuses(client: SupabaseClient, userId: string): Promise<Record<string, PackStatus>> {
  const result = await client
    .from("pack_connections")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const latest = new Map<string, PackConnection>();
  for (const row of (result.data as PackConnectionRow[]).map(mapRow)) {
    const other = row.requesterId === userId ? row.addresseeId : row.requesterId;
    if (!latest.has(other)) latest.set(other, row); // rows are newest-first
  }

  const out: Record<string, PackStatus> = {};
  for (const [other, row] of latest) {
    if (row.status === "accepted") {
      out[other] = "accepted";
    } else if (row.status === "pending") {
      out[other] = row.requesterId === userId ? "pending_out" : "pending_in";
    }
    // declined → omit (treated as "none" by callers)
  }
  return out;
}

// Bones waiting to be caught: pending requests where the caller is the addressee.
export async function listPendingReceived(client: SupabaseClient, userId: string): Promise<PackMember[]> {
  const result = await client
    .from("pack_connections")
    .select("*")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data as PackConnectionRow[]).map(mapRow);
  return hydrateMembers(client, rows, userId);
}

// "Moje stado": accepted connections in either direction.
export async function listPack(client: SupabaseClient, userId: string): Promise<PackMember[]> {
  const result = await client
    .from("pack_connections")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status", "accepted")
    .order("updated_at", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data as PackConnectionRow[]).map(mapRow);
  return hydrateMembers(client, rows, userId);
}

// Attach each connection's "other party" profile. Drops rows whose profile is
// missing (e.g. deleted account) so callers never render a half-empty member.
async function hydrateMembers(client: SupabaseClient, rows: PackConnection[], userId: string): Promise<PackMember[]> {
  const members = await Promise.all(
    rows.map(async (row) => {
      const otherId = row.requesterId === userId ? row.addresseeId : row.requesterId;
      const profile = await getProfile(client, otherId);
      return profile ? { connectionId: row.id, ownerId: otherId, profile } : null;
    }),
  );
  return members.filter((m): m is PackMember => m !== null);
}
