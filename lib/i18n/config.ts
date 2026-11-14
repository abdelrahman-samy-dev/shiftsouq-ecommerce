/* ══════════════════════════════════════════════════════════════
   i18n Configuration
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

export const i18n = {
  defaultLocale: "en" as Locale,
  locales: ["en", "ar"] as Locale[],
} as const;

export type I18nConfig = typeof i18n;

/** Name of the cookie that stores the visitor's language choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** The language choice is remembered for one year (seconds). */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie options used everywhere the language cookie is written. */
export const LOCALE_COOKIE_OPTIONS = {
  path: "/",
  maxAge: LOCALE_COOKIE_MAX_AGE,
  sameSite: "lax",
} as const;

/** Check if a locale is valid */
export function isValidLocale(locale: string): locale is Locale {
  return i18n.locales.includes(locale as Locale);
}

/**
 * Turns any raw value (cookie, query param…) into a supported locale.
 * Unknown or missing values fall back to the default locale, so a
 * tampered cookie can never crash dictionary loading.
 */
export function resolveLocale(value: string | null | undefined): Locale {
  return value && isValidLocale(value) ? value : i18n.defaultLocale;
}

/** Get text direction for a locale */
export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
