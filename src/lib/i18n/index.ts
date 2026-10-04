import pl from "./pl";
import en from "./en";

export type Locale = "pl" | "en";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "locale";

/**
 * Locales currently offered to users. Polish is intentionally withheld while the
 * `pl` translations are still being built out — the `pl` dictionary and the
 * `Locale` type stay in place so it can be re-enabled by adding "pl" back here.
 */
export const ENABLED_LOCALES: readonly Locale[] = ["en"];

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "pl" || v === "en";
}

/** True only for locales that are both valid and currently enabled. */
export function isEnabledLocale(v: string | null | undefined): v is Locale {
  return isLocale(v) && ENABLED_LOCALES.includes(v);
}

/**
 * Look up a translation for the active locale, falling back to the key itself
 * when the entry is absent. Usable from both `.astro` and React.
 */
export function t(locale: Locale, key: string): string {
  const dict = locale === "en" ? en : pl;
  return dict[key] ?? key;
}
