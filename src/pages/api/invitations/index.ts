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
});

export const POST: APIRoute = async (context) => {
  // formData before supabase check: need rawReceiverId for redirect URLs on all error paths
  const form = await context.request.formData();
  const rawReceiverId = (form.get("receiver_id") as string | null) ?? "";

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    const target = rawReceiverId ? `/owners/${rawReceiverId}` : "/owners";
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

  const parsed = invitationSchema.safeParse({
    receiver_id: rawReceiverId,
    type: form.get("type"),
    dog_id: rawDogId ?? undefined,
    scheduled_at: rawScheduledAt ?? "",
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid invitation data";
    if (!rawReceiverId) {
      return context.redirect(`/owners?error=${encodeURIComponent(message)}`);
    }
    return context.redirect(`/meetings/new?receiver_id=${rawReceiverId}&error=${encodeURIComponent(message)}`);
  }

  const { receiver_id, type, dog_id, scheduled_at } = parsed.data;

  try {
    await sendInvitation(supabase, user.id, receiver_id, type, dog_id, scheduled_at);
  } catch {
    return context.redirect(
      `/meetings/new?receiver_id=${receiver_id}&error=${encodeURIComponent("Something went wrong. Please try again.")}`,
    );
  }

  return context.redirect("/meetings");
};
