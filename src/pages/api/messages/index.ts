import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { listConversation, sendMessage } from "@/lib/services/chat";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sendSchema = z.object({
  receiverId: z.uuid(),
  body: z.string().trim().min(1, "Message is empty").max(2000, "Message is too long"),
});

// GET /api/messages?with=<ownerId> — the full conversation with one pack member.
export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase not configured" }, 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const otherId = context.url.searchParams.get("with");
  if (!otherId || !z.uuid().safeParse(otherId).success) {
    return json({ error: "Invalid conversation" }, 400);
  }

  try {
    const messages = await listConversation(supabase, user.id, otherId);
    return json({ messages }, 200);
  } catch {
    return json({ error: "Something went wrong" }, 500);
  }
};

// POST /api/messages — send a text message to a pack member. RLS rejects the
// insert if the two parties are not in the same pack.
export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase not configured" }, 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let raw: unknown;
  try {
    raw = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  if (parsed.data.receiverId === user.id) {
    return json({ error: "You cannot message yourself" }, 400);
  }

  try {
    const message = await sendMessage(supabase, user.id, parsed.data.receiverId, parsed.data.body);
    return json({ message }, 200);
  } catch {
    // RLS rejection (not in pack) lands here too — keep the reason generic.
    return json({ error: "Could not send message" }, 500);
  }
};
