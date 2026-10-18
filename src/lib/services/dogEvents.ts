import type { SupabaseClient } from "@supabase/supabase-js";
import type { DogEvent, DogEventInput, DogEventRecurrence, DogEventType } from "@/types";
import { nextOccurrence } from "@/lib/dogEventAttributes";

interface DogEventRow {
  id: string;
  dog_id: string;
  owner_id: string;
  title: string;
  type: string;
  event_date: string;
  recurrence: string;
  recurrence_interval: number;
  notes: string | null;
  created_at: string;
}

function mapRow(row: DogEventRow): DogEvent {
  return {
    id: row.id,
    dogId: row.dog_id,
    ownerId: row.owner_id,
    title: row.title,
    type: row.type as DogEventType,
    eventDate: row.event_date,
    recurrence: row.recurrence as DogEventRecurrence,
    recurrenceInterval: row.recurrence_interval,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// All of the caller's events (RLS scopes to owner), oldest start date first.
export async function listEventsForOwner(client: SupabaseClient, ownerId: string): Promise<DogEvent[]> {
  const result = await client
    .from("dog_events")
    .select("*")
    .eq("owner_id", ownerId)
    .order("event_date", { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as DogEventRow[]).map(mapRow);
}

export interface UpcomingEvent {
  event: DogEvent;
  nextDate: string; // yyyy-mm-dd, always today-or-future
}

// The caller's soonest upcoming occurrences across all dogs, computed from each
// event's recurrence. Past one-off events (no future occurrence) are excluded.
export async function listUpcomingForOwner(
  client: SupabaseClient,
  ownerId: string,
  limit: number,
): Promise<UpcomingEvent[]> {
  const events = await listEventsForOwner(client, ownerId);
  const upcoming: UpcomingEvent[] = [];
  for (const event of events) {
    const nextDate = nextOccurrence(event.eventDate, event.recurrence, event.recurrenceInterval);
    if (nextDate) upcoming.push({ event, nextDate });
  }
  upcoming.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  return upcoming.slice(0, limit);
}

export async function createDogEvent(client: SupabaseClient, ownerId: string, input: DogEventInput): Promise<DogEvent> {
  const result = await client
    .from("dog_events")
    .insert({
      dog_id: input.dogId,
      owner_id: ownerId,
      title: input.title,
      type: input.type,
      event_date: input.eventDate,
      recurrence: input.recurrence,
      recurrence_interval: input.recurrenceInterval,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return mapRow(result.data as DogEventRow);
}

// RLS enforces ownership; the owner filter is belt-and-suspenders.
export async function deleteDogEvent(client: SupabaseClient, ownerId: string, id: string): Promise<void> {
  const result = await client.from("dog_events").delete().eq("id", id).eq("owner_id", ownerId);
  if (result.error) {
    throw new Error(result.error.message);
  }
}
