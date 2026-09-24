import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dog, DogInput } from "@/types";

const AVATAR_BUCKET = "avatars";

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

function mapRow(client: SupabaseClient, row: DogRow): Dog {
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

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  if (fromName) {
    return fromName.toLowerCase();
  }
  const fromType = file.type.split("/").pop();
  return (fromType ?? "bin").toLowerCase();
}

export async function listDogs(client: SupabaseClient, ownerId: string): Promise<Dog[]> {
  const result = await client
    .from("dogs")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as DogRow[]).map((row) => mapRow(client, row));
}

export async function getDog(client: SupabaseClient, id: string): Promise<Dog | null> {
  const result = await client.from("dogs").select("*").eq("id", id).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) {
    return null;
  }
  return mapRow(client, result.data as DogRow);
}

export async function uploadDogPhoto(
  client: SupabaseClient,
  ownerId: string,
  dogId: string,
  file: File,
): Promise<string> {
  const ext = extensionFor(file);
  const path = `${ownerId}/dogs/${dogId}.${ext}`;

  const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(error.message);
  }
  return path;
}

export async function createDog(client: SupabaseClient, ownerId: string, input: DogInput): Promise<Dog> {
  const insertResult = await client
    .from("dogs")
    .insert({
      owner_id: ownerId,
      name: input.name,
      breed: input.breed,
      birthdate: input.birthdate ?? null,
    })
    .select()
    .single();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
  const created = insertResult.data as DogRow;

  if (input.photo) {
    const photoPath = await uploadDogPhoto(client, ownerId, created.id, input.photo);
    const updateResult = await client
      .from("dogs")
      .update({ photo_path: photoPath })
      .eq("id", created.id)
      .select()
      .single();

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
    return mapRow(client, updateResult.data as DogRow);
  }

  return mapRow(client, created);
}

export async function updateDog(
  client: SupabaseClient,
  ownerId: string,
  id: string,
  input: DogInput,
): Promise<Dog> {
  const row: {
    name: string;
    breed: string;
    birthdate: string | null;
    photo_path?: string;
  } = {
    name: input.name,
    breed: input.breed,
    birthdate: input.birthdate ?? null,
  };

  // Only touch photo_path when a new photo was uploaded; otherwise preserve
  // whatever the row already has (a text-only edit must not null it out).
  if (input.photo) {
    row.photo_path = await uploadDogPhoto(client, ownerId, id, input.photo);
  }

  const result = await client.from("dogs").update(row).eq("id", id).select().single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(client, result.data as DogRow);
}

export async function deleteDog(client: SupabaseClient, ownerId: string, id: string): Promise<void> {
  // Best-effort remove the stored photo first; ignore storage errors so a
  // missing/absent object never blocks the row delete. RLS enforces ownership
  // on the delete; ownerId is used only to scope the storage lookup.
  const existing = await client.from("dogs").select("photo_path").eq("id", id).maybeSingle();
  const photoPath = (existing.data?.photo_path ?? null) as string | null;
  if (photoPath) {
    await client.storage.from(AVATAR_BUCKET).remove([photoPath]);
  }

  const result = await client.from("dogs").delete().eq("id", id);
  if (result.error) {
    throw new Error(result.error.message);
  }
}
