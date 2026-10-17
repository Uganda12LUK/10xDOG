import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dog, DogWithOwner, OwnerLocation, OwnerWithDogs, Profile, PublicProfile } from "@/types";
import type { DogSize } from "@/lib/dogAttributes";
import { DISCOVERY_RADIUS_KM } from "@/lib/geo";

const AVATAR_BUCKET = "avatars";

// Writable subset accepted by upsertProfile. The photo has already been
// uploaded by the caller (see uploadAvatar), so this carries the resulting
// storage path rather than a File. Omitting avatarPath leaves the existing
// avatar untouched on a text-only edit.
export interface ProfileUpsert {
  name: string;
  street?: string | null;
  city?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  avatarPath?: string;
}

interface ProfileRow {
  id: string;
  name: string;
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
    city: row.city,
    avatarPath: row.avatar_path,
    avatarUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Private location row (owner-only `profile_locations`). `street` is the app name
// for the DB `district` column.
interface ProfileLocationRow {
  district: string | null;
  location_lat: number | null;
  location_lng: number | null;
}

function mapOwnLocation(row: ProfileLocationRow): OwnerLocation {
  return { street: row.district, locationLat: row.location_lat, locationLng: row.location_lng };
}

// Read the viewer's OWN location (owner-only RLS on `profile_locations` means a client
// can only ever read its own row) — for self pages (profile edit, map anchor), never a
// foreign read.
export async function getOwnLocation(client: SupabaseClient, userId: string): Promise<OwnerLocation | null> {
  const result = await client
    .from("profile_locations")
    .select("district, location_lat, location_lng")
    .eq("profile_id", userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) {
    return null;
  }
  return mapOwnLocation(result.data);
}

// Narrow row for the foreign-safe read: only the columns getPublicProfile
// selects. Keeping it separate from ProfileRow ensures private columns
// (district/location_lat/location_lng) never enter this code path.
interface PublicProfileRow {
  id: string;
  name: string;
  city: string | null;
  avatar_path: string | null;
}

function mapPublicRow(client: SupabaseClient, row: PublicProfileRow): PublicProfile {
  const avatarUrl = row.avatar_path
    ? client.storage.from(AVATAR_BUCKET).getPublicUrl(row.avatar_path).data.publicUrl
    : null;

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    avatarPath: row.avatar_path,
    avatarUrl,
  };
}

// Foreign-safe single-profile read. Uses an explicit column allow-list (never
// `*`) so private columns are not even fetched, and maps via mapPublicRow —
// NOT mapRow, which pulls street/coords. Mirrors getProfile's error/null convention.
export async function getPublicProfile(client: SupabaseClient, userId: string): Promise<PublicProfile | null> {
  const result = await client.from("profiles").select("id, name, city, avatar_path").eq("id", userId).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) {
    return null;
  }
  return mapPublicRow(client, result.data);
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
  size: string | null;
  weight_kg: number | string | null;
  traits: string[] | null;
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
    size: (row.size as DogSize | null) ?? null,
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    traits: row.traits ?? [],
    photoPath: row.photo_path,
    photoUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listOwners(client: SupabaseClient): Promise<OwnerWithDogs[]> {
  // Discovery runs server-side: discoverable_owner_ids() (SECURITY DEFINER) computes the
  // geographic radius from the private pins/city centers and returns only public owner
  // IDs, so coordinates never cross the Data API. It anchors internally on auth.uid(),
  // so the viewer (userId) is already excluded from the result.
  const idsResult = await client.rpc("discoverable_owner_ids", { radius_km: DISCOVERY_RADIUS_KM });
  if (idsResult.error) {
    throw new Error(idsResult.error.message);
  }
  const ownerIds = (idsResult.data ?? []) as string[];
  if (ownerIds.length === 0) {
    return [];
  }

  const profileResult = await client.from("profiles").select("*").in("id", ownerIds);
  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  const profiles = (profileResult.data as ProfileRow[]).map((row) => mapRow(client, row));

  const dogResult = await client.from("dogs").select("*").in("owner_id", ownerIds);
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

export async function listDogsForMap(client: SupabaseClient): Promise<DogWithOwner[]> {
  const owners = await listOwners(client);

  return owners.flatMap((owner) =>
    owner.dogs.map((dog) => ({
      ...dog,
      ownerId: owner.profile.id,
      ownerName: owner.profile.name,
      ownerCity: owner.profile.city,
    })),
  );
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
    city: string | null;
    avatar_path?: string | null;
  } = {
    id: userId,
    name: input.name,
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

  // Private location lives in the owner-only table. `street` maps to the DB `district`
  // column. Write it after the profile so the FK (profile_id -> profiles.id) is satisfied.
  const locationResult = await client.from("profile_locations").upsert(
    {
      profile_id: userId,
      district: input.street ?? null,
      location_lat: input.locationLat ?? null,
      location_lng: input.locationLng ?? null,
    },
    { onConflict: "profile_id" },
  );
  if (locationResult.error) {
    throw new Error(locationResult.error.message);
  }

  return mapRow(client, result.data as ProfileRow);
}
