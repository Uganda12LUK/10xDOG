import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { BREEDS } from "@/lib/breeds";
import { DOG_SIZES, DOG_TRAITS, type DogSize } from "@/lib/dogAttributes";
import { createDog } from "@/lib/services/dog";

export const prerender = false;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const dogSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  breed: z.enum(BREEDS as unknown as [string, ...string[]], {
    message: "Choose a breed from the list",
  }),
  birthdate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => {
        if (value === null) {
          return true;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return false;
        }
        return parsed.getTime() <= Date.now();
      },
      { message: "Birthdate must be a valid date that is not in the future" },
    ),
  size: z.preprocess(
    (value) => (typeof value === "string" && value.length > 0 ? value : null),
    z.enum(DOG_SIZES as unknown as [string, ...string[]], { message: "Invalid size" }).nullable(),
  ),
  traits: z.array(z.enum(DOG_TRAITS as unknown as [string, ...string[]], { message: "Invalid trait" })).default([]),
});

function redirectError(context: Parameters<APIRoute>[0], message: string) {
  return context.redirect(`/dogs/new?error=${encodeURIComponent(message)}`);
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

  const parsed = dogSchema.safeParse({
    name: form.get("name"),
    breed: form.get("breed"),
    birthdate: form.get("birthdate") ?? undefined,
    size: form.get("size"),
    traits: form.getAll("traits"),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid dog data";
    return redirectError(context, message);
  }

  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto) {
    if (!ALLOWED_IMAGE_TYPES.includes(photo.type)) {
      return redirectError(context, "Photo must be a PNG, JPEG, or WebP image");
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return redirectError(context, "Photo must be 5 MB or smaller");
    }
  }

  try {
    await createDog(supabase, user.id, {
      name: parsed.data.name,
      breed: parsed.data.breed,
      birthdate: parsed.data.birthdate,
      size: parsed.data.size as DogSize | null,
      traits: parsed.data.traits,
      photo: hasPhoto ? photo : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save dog";
    return redirectError(context, message);
  }

  return context.redirect("/dogs?saved=1");
};
