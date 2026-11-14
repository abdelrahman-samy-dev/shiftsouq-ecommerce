/* ══════════════════════════════════════════════════════════════
   Server-side locale helpers
   ──────────────────────────────────────────────────────────────
   One place that reads the NEXT_LOCALE cookie for Server
   Components, Route Handlers and Server Functions.
   ══════════════════════════════════════════════════════════════ */

import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { LOCALE_COOKIE, resolveLocale } from "./config";
import { getDictionary } from "./get-dictionary";

/** The visitor's locale from the NEXT_LOCALE cookie ("en" by default). */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
});

/** The visitor's locale together with its dictionary. */
export async function getLocaleAndDictionary() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return { locale, dict };
}
