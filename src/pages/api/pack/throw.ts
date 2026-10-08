import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { throwBone } from "@/lib/services/pack";

export const prerender = false;

const schema = z.object({
  receiver_id: z.uuid("Invalid receiver"),
});

export const POST: APIRoute = async (context) => {
  // formData first so we can build redirect URLs back to the owner profile on any error path.
  const form = await context.request.formData();
  const rawReceiverId = (form.get("receiver_id") as string | null) ?? "";
  const back = rawReceiverId ? `/map/${rawReceiverId}` : "/map";

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`${back}?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const parsed = schema.safeParse({ receiver_id: rawReceiverId });
  if (!parsed.success) {
    return context.redirect(`/map?error=${encodeURIComponent("Invalid owner")}`);
  }

  // Guard self-invite at the trust boundary (the DB CHECK is the backstop).
  if (parsed.data.receiver_id === user.id) {
    return context.redirect(`${back}?error=${encodeURIComponent("You cannot throw a bone to yourself")}`);
  }

  try {
    await throwBone(supabase, user.id, parsed.data.receiver_id);
  } catch {
    // Most likely a duplicate pending request (partial unique index) — keep it generic.
    return context.redirect(`${back}?error=${encodeURIComponent("Bone already thrown or something went wrong")}`);
  }

  return context.redirect(back);
};
