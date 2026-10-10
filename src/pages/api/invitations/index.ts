import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { sendInvitation } from "@/lib/services/invitation";

export const prerender = false;

const invitationSchema = z.object({
  receiver_id: z.uuid("Invalid receiver"),
  type: z.enum(["walk", "breeding"]),
  dog_id: z.uuid().nullish(),
  scheduled_at: z
    .string()
    .trim()
    .min(1, "Wybierz datę i godzinę spotkania")
    .refine((value) => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return false;
      }
      return parsed.getTime() >= Date.now();
    }, "Data spotkania musi być poprawna i nie może być w przeszłości"),
  location_lat: z.coerce.number().min(-90).max(90).nullish(),
  location_lng: z.coerce.number().min(-180).max(180).nullish(),
});

export const POST: APIRoute = async (context) => {
  // formData before supabase check: need rawReceiverId for redirect URLs on all error paths
  const form = await context.request.formData();
  const rawReceiverId = (form.get("receiver_id") as string | null) ?? "";

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    const target = rawReceiverId ? `/map/${rawReceiverId}` : "/map";
    return context.redirect(`${target}?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const rawDogId = form.get("dog_id") as string | null;
  const rawScheduledAt = form.get("scheduled_at") as string | null;
  const rawLat = form.get("location_lat") as string | null;
  const rawLng = form.get("location_lng") as string | null;

  const parsed = invitationSchema.safeParse({
    receiver_id: rawReceiverId,
    type: form.get("type"),
    dog_id: rawDogId ?? undefined,
    scheduled_at: rawScheduledAt ?? "",
    location_lat: rawLat ?? undefined,
    location_lng: rawLng ?? undefined,
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid invitation data";
    if (!rawReceiverId) {
      return context.redirect(`/map?error=${encodeURIComponent(message)}`);
    }
    return context.redirect(`/meetings/new?receiver_id=${rawReceiverId}&error=${encodeURIComponent(message)}`);
  }

  const { receiver_id, type, dog_id, scheduled_at, location_lat, location_lng } = parsed.data;

  try {
    await sendInvitation(supabase, user.id, receiver_id, type, dog_id, scheduled_at, location_lat, location_lng);
  } catch (err) {
    // Monitoring: surface the cause to the Cloudflare Workers log stream (the
    // only tracker boundary this app has). No PII — ids only, never names/emails.
    // eslint-disable-next-line no-console
    console.error("[api/invitations] sendInvitation failed", {
      senderId: user.id,
      receiverId: receiver_id,
      type,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    // Response: an unexpected server failure must reach the response AS a
    // failure (5xx), not be flattened into a 302 redirect that monitoring reads
    // as success. Validation errors are already handled above with a redirect.
    return new Response(JSON.stringify({ error: "Failed to send invitation" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return context.redirect("/meetings");
};
