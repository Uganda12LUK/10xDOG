import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { DOG_EVENT_RECURRENCES, DOG_EVENT_TYPES } from "@/lib/dogEventAttributes";
import { createDogEvent, deleteDogEvent, updateDogEvent } from "@/lib/services/dogEvents";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const createSchema = z.object({
  dogId: z.uuid(),
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  type: z.enum(DOG_EVENT_TYPES as unknown as [string, ...string[]]),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  eventTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time")
    .nullish(),
  recurrence: z.enum(DOG_EVENT_RECURRENCES as unknown as [string, ...string[]]),
  recurrenceInterval: z.coerce.number().int().min(1).max(365).default(1),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

// POST /api/dog-events — create a calendar event for one of the caller's dogs.
export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return json({ error: "Supabase not configured" }, 503);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  let raw: unknown;
  try {
    raw = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  try {
    const event = await createDogEvent(supabase, user.id, {
      dogId: parsed.data.dogId,
      title: parsed.data.title,
      type: parsed.data.type as (typeof DOG_EVENT_TYPES)[number],
      eventDate: parsed.data.eventDate,
      eventTime: parsed.data.eventTime ?? null,
      recurrence: parsed.data.recurrence as (typeof DOG_EVENT_RECURRENCES)[number],
      recurrenceInterval: parsed.data.recurrenceInterval,
      notes: parsed.data.notes,
    });
    return json({ event }, 200);
  } catch (e) {
    // Surface the real reason (e.g. missing table/column, RLS) to speed diagnosis.
    return json({ error: e instanceof Error ? e.message : "Could not save event" }, 500);
  }
};

// PATCH /api/dog-events?id=<uuid> — update one of the caller's events.
export const PATCH: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return json({ error: "Supabase not configured" }, 503);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const id = context.url.searchParams.get("id");
  if (!id || !z.uuid().safeParse(id).success) {
    return json({ error: "Invalid id" }, 400);
  }

  let raw: unknown;
  try {
    raw = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  try {
    const event = await updateDogEvent(supabase, user.id, id, {
      dogId: parsed.data.dogId,
      title: parsed.data.title,
      type: parsed.data.type as (typeof DOG_EVENT_TYPES)[number],
      eventDate: parsed.data.eventDate,
      eventTime: parsed.data.eventTime ?? null,
      recurrence: parsed.data.recurrence as (typeof DOG_EVENT_RECURRENCES)[number],
      recurrenceInterval: parsed.data.recurrenceInterval,
      notes: parsed.data.notes,
    });
    return json({ event }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not save event" }, 500);
  }
};

// DELETE /api/dog-events?id=<uuid> — remove one of the caller's events.
export const DELETE: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return json({ error: "Supabase not configured" }, 503);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const id = context.url.searchParams.get("id");
  if (!id || !z.uuid().safeParse(id).success) {
    return json({ error: "Invalid id" }, 400);
  }

  try {
    await deleteDogEvent(supabase, user.id, id);
    return json({ ok: true }, 200);
  } catch {
    return json({ error: "Could not delete event" }, 500);
  }
};
