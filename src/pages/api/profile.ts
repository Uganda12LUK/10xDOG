import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { uploadAvatar, upsertProfile } from "@/lib/services/profile";

export const prerender = false;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  district: optionalTrimmed,
  city: optionalTrimmed,
  location_lat: z.coerce.number().min(-90).max(90).nullish(),
  location_lng: z.coerce.number().min(-180).max(180).nullish(),
});

function redirectError(context: Parameters<APIRoute>[0], message: string) {
  return context.redirect(`/profile?error=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return redirectError(context, "Supabase is not configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();

  const rawLat = form.get("location_lat") as string | null;
  const rawLng = form.get("location_lng") as string | null;

  const parsed = profileSchema.safeParse({
    name: form.get("name"),
    district: form.get("district") ?? undefined,
    city: form.get("city") ?? undefined,
    location_lat: rawLat ?? undefined,
    location_lng: rawLng ?? undefined,
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid profile data";
    return redirectError(context, message);
  }

  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto) {
    if (!ALLOWED_IMAGE_TYPES.includes(photo.type)) {
      return redirectError(context, "Avatar must be a PNG, JPEG, or WebP image");
    }
    if (photo.size > MAX_AVATAR_BYTES) {
      return redirectError(context, "Avatar must be 5 MB or smaller");
    }
  }

  try {
    const avatarPath = hasPhoto ? await uploadAvatar(supabase, user.id, photo) : undefined;

    await upsertProfile(supabase, user.id, {
      name: parsed.data.name,
      district: parsed.data.district,
      city: parsed.data.city,
      locationLat: parsed.data.location_lat,
      locationLng: parsed.data.location_lng,
      avatarPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile";
    return redirectError(context, message);
  }

  return context.redirect("/profile?saved=1");
};
