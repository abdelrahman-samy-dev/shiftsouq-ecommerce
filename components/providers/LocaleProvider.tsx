"use client";

/* ══════════════════════════════════════════════════════════════
   LocaleProvider — current locale for Client Components
   ──────────────────────────────────────────────────────────────
   The root layout reads the NEXT_LOCALE cookie and passes the
   locale here, so any Client Component (error boundaries,
   pagination, toggles…) can call `useLocale()` instead of having
   the locale threaded through props.
   ══════════════════════════════════════════════════════════════ */

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/types";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The active locale ("en" | "ar"). */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Text that exists in both languages. */
export type Localized = string | { en: string; ar: string };

/** Picks the right language from a `Localized` value. */
export function pickLocalized(value: Localized, locale: Locale): string {
  return typeof value === "string" ? value : value[locale];
}
