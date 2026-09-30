import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";
import { getProfile } from "@/lib/services/profile";
import { PROTECTED_ROUTES } from "@/lib/protected-routes";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";

export { PROTECTED_ROUTES };

export const onRequest = defineMiddleware(async (context, next) => {
  // Locale resolution — must run before any redirect below.
  // `?lang=` switches the language: persist to a cookie and redirect to the
  // same path without the `lang` param (preserving any other query params).
  const langParam = context.url.searchParams.get("lang");
  if (isLocale(langParam)) {
    context.cookies.set(LOCALE_COOKIE, langParam, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
    });
    const target = new URL(context.url);
    target.searchParams.delete("lang");
    return context.redirect(target.pathname + target.search);
  }
  const cookieLocale = context.cookies.get(LOCALE_COOKIE)?.value;
  context.locals.locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

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

  // Redirect logged-in users away from the landing page to the dashboard.
  if (context.locals.user && pathname === "/") {
    return context.redirect("/dashboard");
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
