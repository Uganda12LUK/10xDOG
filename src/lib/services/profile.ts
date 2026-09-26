import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dog, OwnerWithDogs, Profile } from "@/types";

const AVATAR_BUCKET = "avatars";

// Writable subset accepted by upsertProfile. The photo has already been
// uploaded by the caller (see uploadAvatar), so this carries the resulting
// storage path rather than a File. Omitting avatarPath leaves the existing
// avatar untouched on a text-only edit.
export interface ProfileUpsert {
  name: string;
  district?: string | null;
  city?: string | null;
  avatarPath?: string;
}

interface ProfileRow {
  id: string;
  name: string;
  district: string | null;
  city: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(client: SupabaseClient, row: ProfileRow): Profile {
  const avatarUrl = row.avatar_path
    ? client.storage.from(AVATAR_BUCKET).getPublicUrl(row.avatar_path).data.publicUrl
    : null;

  return {
    id: row.id,
    name: row.name,
    district: row.district,
    city: row.city,
    avatarPath: row.avatar_path,
    avatarUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  if (fromName) {
    return fromName.toLowerCase();
  }
  const fromType = file.type.split("/").pop();
  return (fromType ?? "bin").toLowerCase();
}

export async function getProfile(client: SupabaseClient, userId: string): Promise<Profile | null> {
  const result = await client.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) {
    return null;
  }
  return mapRow(client, result.data as ProfileRow);
}

export async function uploadAvatar(client: SupabaseClient, userId: string, file: File): Promise<string> {
  const ext = extensionFor(file);
  const path = `${userId}/avatar.${ext}`;

  const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(error.message);
  }
  return path;
}

interface DogRow {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  birthdate: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
}

function mapDogRow(client: SupabaseClient, row: DogRow): Dog {
  const photoUrl = row.photo_path
    ? client.storage.from(AVATAR_BUCKET).getPublicUrl(row.photo_path).data.publicUrl
    : null;

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    breed: row.breed,
    birthdate: row.birthdate,
    photoPath: row.photo_path,
    photoUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listOwners(
  client: SupabaseClient,
  userId: string,
  city: string,
  district?: string | null,
): Promise<OwnerWithDogs[]> {
  let profileQuery = client.from("profiles").select("*").eq("city", city).neq("id", userId);
  if (district != null) {
    profileQuery = profileQuery.eq("district", district);
  }

  const profileResult = await profileQuery;
  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  const profiles = (profileResult.data as ProfileRow[]).map((row) => mapRow(client, row));

  if (profiles.length === 0) {
    return [];
  }

  const profileIds = profiles.map((p) => p.id);

  const dogResult = await client.from("dogs").select("*").in("owner_id", profileIds);
  if (dogResult.error) {
    throw new Error(dogResult.error.message);
  }

  const dogsByOwner = new Map<string, Dog[]>();
  for (const row of dogResult.data as DogRow[]) {
    const dog = mapDogRow(client, row);
    const existing = dogsByOwner.get(dog.ownerId);
    if (existing) {
      existing.push(dog);
    } else {
      dogsByOwner.set(dog.ownerId, [dog]);
    }
  }

  return profiles
    .map((profile) => ({ profile, dogs: dogsByOwner.get(profile.id) ?? [] }))
    .sort((a, b) => a.profile.name.localeCompare(b.profile.name));
}

export async function listProfilesByIds(client: SupabaseClient, ids: string[]): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const result = await client.from("profiles").select("*").in("id", ids);
  if (result.error) {
    throw new Error(result.error.message);
  }
  const map = new Map<string, Profile>();
  for (const row of result.data as ProfileRow[]) {
    map.set(row.id, mapRow(client, row));
  }
  return map;
}

export async function upsertProfile(client: SupabaseClient, userId: string, input: ProfileUpsert): Promise<Profile> {
  const row: {
    id: string;
    name: string;
    district: string | null;
    city: string | null;
    avatar_path?: string | null;
  } = {
    id: userId,
    name: input.name,
    district: input.district ?? null,
    city: input.city ?? null,
  };

  // Only touch avatar_path when a new avatar was uploaded; otherwise preserve
  // whatever the row already has (a text-only edit must not null it out).
  if (typeof input.avatarPath === "string") {
    row.avatar_path = input.avatarPath;
  }

  const result = await client.from("profiles").upsert(row, { onConflict: "id" }).select().single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(client, result.data as ProfileRow);
}
