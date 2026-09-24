import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";
import { getProfile } from "@/lib/services/profile";

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/dogs"];

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
  } else {
    context.locals.user = null;
  }

  const pathname = context.url.pathname;
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  // Soft onboarding: nudge logged-in users with no profile toward /profile,
  // without trapping them (skip /profile itself, plus API and auth paths).
  if (
    context.locals.user &&
    supabase &&
    isProtected &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/auth")
  ) {
    const profile = await getProfile(supabase, context.locals.user.id);
    if (!profile) {
      return context.redirect("/profile?onboarding=1");
    }
  }

  return next();
});
