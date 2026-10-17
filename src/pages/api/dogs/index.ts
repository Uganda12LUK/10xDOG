import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { DOG_SIZES, DOG_TRAITS, type DogSize } from "@/lib/dogAttributes";
import { createDog, listDogs } from "@/lib/services/dog";

export const prerender = false;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const dogSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  breed: z.string().trim().min(1, "Breed is required").max(60, "Breed is too long"),
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
  // Accept an empty field (null) or a positive number. Tolerate a comma decimal
  // separator (pl-PL) by normalizing it to a dot before coercion.
  weightKg: z.preprocess((value) => {
    if (typeof value !== "string" || value.trim().length === 0) return null;
    const n = Number(value.replace(",", "."));
    return Number.isNaN(n) ? value : n;
  }, z.number().positive("Weight must be a positive number").max(150, "Weight is too high").nullable()),
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
    weightKg: form.get("weight_kg"),
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

  // Is this the owner's first dog? If so, they're a new user finishing onboarding —
  // send them to the home view afterwards instead of the dog list. Best-effort: on a
  // count failure, fall back to the dog list (the safe, existing behaviour).
  let isFirstDog = false;
  try {
    isFirstDog = (await listDogs(supabase, user.id)).length === 0;
  } catch {
    // on a count failure, isFirstDog stays false → fall back to the dog list
  }

  try {
    await createDog(supabase, user.id, {
      name: parsed.data.name,
      breed: parsed.data.breed,
      birthdate: parsed.data.birthdate,
      size: parsed.data.size as DogSize | null,
      weightKg: parsed.data.weightKg,
      traits: parsed.data.traits,
      photo: hasPhoto ? photo : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save dog";
    return redirectError(context, message);
  }

  return context.redirect(isFirstDog ? "/dashboard" : "/dogs?saved=1");
};
