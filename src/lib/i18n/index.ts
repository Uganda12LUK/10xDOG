import pl from "./pl";
import en from "./en";

export type Locale = "pl" | "en";

export const DEFAULT_LOCALE: Locale = "pl";

export const LOCALE_COOKIE = "locale";

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "pl" || v === "en";
}

/**
 * Look up a translation for the active locale, falling back to the key itself
 * when the entry is absent. Usable from both `.astro` and React.
 */
export function t(locale: Locale, key: string): string {
  const dict = locale === "en" ? en : pl;
  return dict[key] ?? key;
}
