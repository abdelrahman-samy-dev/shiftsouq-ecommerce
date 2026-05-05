/* ══════════════════════════════════════════════════════════════
   i18n Configuration
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

export const i18n = {
  defaultLocale: "en" as Locale,
  locales: ["en", "ar"] as Locale[],
} as const;

export type I18nConfig = typeof i18n;

/** Check if a locale is valid */
export function isValidLocale(locale: string): locale is Locale {
  return i18n.locales.includes(locale as Locale);
}

/** Get text direction for a locale */
export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
