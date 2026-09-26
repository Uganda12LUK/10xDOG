import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { respondToInvitation } from "@/lib/services/invitation";

export const prerender = false;

const actionSchema = z.object({
  _action: z.enum(["accept", "decline"]),
});

export const POST: APIRoute = async (context) => {
  const id = context.params.id;
  if (!id) {
    return context.redirect("/invitations");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/invitations?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();

  const parsed = actionSchema.safeParse({
    _action: form.get("_action"),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid action";
    return context.redirect(`/invitations?error=${encodeURIComponent(message)}`);
  }

  const response = parsed.data._action === "accept" ? "accepted" : "declined";

  try {
    await respondToInvitation(supabase, user.id, id, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to respond to invitation";
    return context.redirect(`/invitations?error=${encodeURIComponent(message)}`);
  }

  return context.redirect("/invitations?saved=1");
};
